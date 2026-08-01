// Supabase Edge Function — plate photo → nutrition + ingredient tags via Gemini Flash
// Deploy: npx supabase functions deploy estimate-meal
// Secret: npx supabase secrets set GEMINI_API_KEY=your_key

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type EstimateBody = {
  imageBase64?: string
  mimeType?: string
}

type PlateEstimate = {
  description: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  ingredients: string[]
}

// Prefer a current free-tier Flash model. Override anytime with secret GEMINI_MODEL.
const MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite'

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
    const imageBase64 = body.imageBase64?.replace(/^data:[^;]+;base64,/, '')
    const mimeType = body.mimeType || 'image/jpeg'

    if (!imageBase64) {
      return json({ error: 'imageBase64 is required' }, 400)
    }

    const prompt = `You are estimating nutrition for a personal calorie tracker.
Analyze this whole-plate meal photo.

Rules:
1. Estimate the ACTUAL portion visible — not a generic cookbook serving.
2. Use plate size, utensils, or other scale cues when present.
3. Prefer whole-plate totals (one meal), not a long itemized recipe.
4. description: short English name for the plate (e.g. "Grilled chicken with rice and vegetables").
5. calories: integer kcal for the whole plate.
6. proteinG, carbsG, fatG: grams for the whole plate (one decimal ok).
7. ingredients: array of 3–10 BASE ingredient tags in lowercase English.
   - Use generic food names only: "chicken", "rice", "egg", "tomato" — NOT preparations like "fried chicken", "scrambled eggs", "basmati rice".
   - Singular forms when possible.
   - Do NOT split calories per ingredient.
8. If the image is not food, return zeros, description "Not a meal", ingredients [].

Return ONLY valid JSON with keys:
description, calories, proteinG, carbsG, fatG, ingredients`

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent` +
      `?key=${encodeURIComponent(geminiKey)}`

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('Gemini error', geminiRes.status, errText)
      if (geminiRes.status === 429) {
        return json(
          {
            error:
              'Gemini free-tier limit reached. Wait 1–2 minutes and try once more. If it keeps failing, wait until tomorrow (quota resets daily) or enter calories manually — photo save still works without estimate.',
          },
          429,
        )
      }
      if (geminiRes.status === 400 || geminiRes.status === 403 || geminiRes.status === 404) {
        return json(
          {
            error: summarizeGeminiError(geminiRes.status, errText),
          },
          502,
        )
      }
      return json(
        { error: summarizeGeminiError(geminiRes.status, errText) },
        502,
      )
    }

    const geminiJson = await geminiRes.json()
    const text: string | undefined =
      geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      const blockReason = geminiJson?.promptFeedback?.blockReason
      return json(
        {
          error: blockReason
            ? `AI blocked the image (${blockReason})`
            : 'AI returned an empty response',
        },
        502,
      )
    }

    try {
      const parsed = parseEstimate(text)
      return json(parsed)
    } catch {
      console.error('Parse failed', text)
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

function summarizeGeminiError(status: number, errText: string): string {
  let message = ''
  try {
    const parsed = JSON.parse(errText)
    message = parsed?.error?.message || errText
  } catch {
    message = errText
  }
  const short = String(message).slice(0, 220)
  if (status === 400 && /API key|api key|INVALID_ARGUMENT/i.test(short)) {
    return `Gemini rejected the request (check API key). ${short}`
  }
  if (status === 403) {
    return `Gemini access denied (API key or API not enabled). ${short}`
  }
  if (status === 404) {
    return `Gemini model not found. ${short}`
  }
  return `AI estimate failed (${status}): ${short}`
}

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
