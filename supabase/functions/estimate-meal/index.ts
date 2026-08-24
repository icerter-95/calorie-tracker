/**
 * Edge Function: photo and/or text → description, calories, macros, tags
 * via Gemini Flash. Optional userNote adjusts portion (e.g. "I ate half").
 *
 * Deploy: npx supabase functions deploy estimate-meal
 * Secret: npx supabase secrets set GEMINI_API_KEY=your_key
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  blockReason,
  candidateText,
  generateContentWithFallback,
  summarizeGeminiError,
} from '../_shared/gemini.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type EstimateBody = {
  imageBase64?: string
  mimeType?: string
  text?: string
  userNote?: string
}

type PlateEstimate = {
  description: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  ingredients: string[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing authorization' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const geminiKey = Deno.env.get('GEMINI_API_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      return json({ error: 'Server misconfigured (Supabase env)' }, 500)
    }
    if (!geminiKey) {
      return json({ error: 'GEMINI_API_KEY secret is not set' }, 500)
    }

    // Require a signed-in user (same JWT the website sends).
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) {
      return json({ error: 'Unauthorized — sign in again and retry' }, 401)
    }

    const body = (await req.json()) as EstimateBody
    const imageBase64 = body.imageBase64?.replace(/^data:[^;]+;base64,/, '') || ''
    const mimeType = body.mimeType || 'image/jpeg'
    const text = body.text?.trim() || ''
    const userNote = body.userNote?.trim() || ''
    const hasImage = Boolean(imageBase64)
    const hasText = Boolean(text)

    if (!hasImage && !hasText) {
      return json({ error: 'imageBase64 or text is required' }, 400)
    }

    const prompt = buildPrompt({ hasImage, text, userNote })
    const parts: Array<Record<string, unknown>> = [{ text: prompt }]
    if (hasImage) {
      parts.push({
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      })
    }

    const geminiResult = await generateContentWithFallback(geminiKey, {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    })

    if (!geminiResult.ok) {
      if (geminiResult.status === 429) {
        return json(
          {
            error:
              'Gemini free-tier limit reached. Wait 1–2 minutes and try once more. If it keeps failing, wait until tomorrow (quota resets daily) or enter calories manually — photo save still works without estimate.',
          },
          429,
        )
      }
      return json(
        {
          error: summarizeGeminiError(geminiResult.status, geminiResult.errText),
        },
        502,
      )
    }

    const responseText = candidateText(geminiResult.json)

    if (!responseText) {
      const reason = blockReason(geminiResult.json)
      return json(
        {
          error: reason
            ? `AI blocked the image (${reason})`
            : 'AI returned an empty response',
        },
        502,
      )
    }

    try {
      const parsed = parseEstimate(responseText)
      return json(parsed)
    } catch {
      console.error('Parse failed', responseText)
      return json({ error: 'AI returned invalid JSON — try another photo' }, 502)
    }
  } catch (err) {
    console.error(err)
    return json(
      { error: err instanceof Error ? err.message : 'Unexpected server error' },
      500,
    )
  }
})

function buildPrompt(opts: { hasImage: boolean; text: string; userNote: string }): string {
  const shared = `Rules:
1. Prefer whole-plate totals (one meal), not a long itemized recipe.
2. description: short English name for the plate (e.g. "Grilled chicken with rice and vegetables").
3. calories: integer kcal for what the user actually ate.
4. proteinG, carbsG, fatG: grams for what the user ate (one decimal ok).
5. ingredients: array of 1–6 MAIN ingredient tags in lowercase English.
   - Only the primary foods that define the meal (e.g. "chicken", "rice", "broccoli") — NOT cooking aids, seasonings, or pantry staples.
   - EXCLUDE: oil, olive oil, butter (as cooking fat), salt, pepper, flour, sugar, spices, herbs, garlic, onion (when used as seasoning), vinegar, soy sauce, water, stock, broth, and similar minor ingredients.
   - Use generic food names only: "chicken", "rice", "egg", "tomato" — NOT preparations like "fried chicken", "scrambled eggs", "basmati rice".
   - Singular forms when possible.
   - Do NOT split calories per ingredient.
6. User comments and descriptions may be English or Spanish. Always return the same JSON keys; description in English.
7. Return ONLY valid JSON with keys: description, calories, proteinG, carbsG, fatG, ingredients`

  if (opts.hasImage) {
    const noteBlock = opts.userNote
      ? `User comment about what they ate:\n"""${opts.userNote}"""`
      : 'The user did not add a comment. Estimate the visible plate as served today.'

    return `You are estimating nutrition for a personal calorie tracker.
Analyze this whole-plate meal photo.

${shared}

Portion rules:
- Estimate the ACTUAL portion visible — not a generic cookbook serving.
- Use plate size, utensils, or other scale cues when present.
- If the user comment describes a portion of what is visible ("I ate half", "only the salad", "two slices", "me comí la mitad"), estimate THAT amount, not the full plate.
- If the user comment is missing or empty, estimate the visible plate as served today.
- If the image is not food, return zeros, description "Not a meal", ingredients [].

${noteBlock}`
  }

  const extra = opts.userNote ? `\n\nAdditional comment:\n"""${opts.userNote}"""` : ''

  return `You are estimating nutrition for a personal calorie tracker.
The user described the meal they ate (voice or typed). Treat this description as the meal — including quantities, leftovers, and shared plates.

${shared}

Meal description:
"""${opts.text}"""${extra}

If the text is not a meal, return zeros, description "Not a meal", ingredients [].`
}

/** Coerce Gemini JSON into the plate-estimate shape the client expects. */
function parseEstimate(text: string): PlateEstimate {
  const cleaned = text.replace(/```json|```/g, '').trim()
  const data = JSON.parse(cleaned) as Partial<PlateEstimate>
  const ingredients = Array.isArray(data.ingredients)
    ? data.ingredients.map((x) => String(x).trim()).filter(Boolean)
    : []
  return {
    description: String(data.description ?? '').trim(),
    calories: Math.max(0, Math.round(Number(data.calories) || 0)),
    proteinG: Math.max(0, Number(data.proteinG) || 0),
    carbsG: Math.max(0, Number(data.carbsG) || 0),
    fatG: Math.max(0, Number(data.fatG) || 0),
    ingredients,
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
