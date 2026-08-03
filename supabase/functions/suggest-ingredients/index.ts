// Supabase Edge Function — meal description text → ingredient tags via Gemini Flash
// Deploy: npx supabase functions deploy suggest-ingredients

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Body = {
  text?: string
}

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

    const body = (await req.json()) as Body
    const text = (body.text || '').trim()
    if (!text) {
      return json({ error: 'text is required' }, 400)
    }

    const prompt = `Extract ingredient tags for a personal calorie tracker from this meal description.

Text: """${text.slice(0, 800)}"""

Rules:
1. Return JSON only: { "ingredients": string[] }
2. 1–6 MAIN ingredient tags in lowercase English — only the primary foods that define the meal.
3. EXCLUDE cooking aids, seasonings, and pantry staples: oil, olive oil, butter (as cooking fat), salt, pepper, flour, sugar, spices, herbs, garlic, onion (when used as seasoning), vinegar, soy sauce, water, stock, broth, and similar minor ingredients.
4. Use generic food names: "chicken", "rice", "egg", "tomato" — NOT preparations like "fried chicken", "scrambled eggs".
5. Singular forms when possible.
6. If nothing edible is clear, return { "ingredients": [] }.`

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent` +
      `?key=${encodeURIComponent(geminiKey)}`

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
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
              'Gemini free-tier limit reached. Wait a minute and try again.',
          },
          429,
        )
      }
      return json({ error: `AI tag suggestion failed (${geminiRes.status})` }, 502)
    }

    const geminiJson = await geminiRes.json()
    const raw: string | undefined =
      geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!raw) {
      return json({ error: 'AI returned an empty response' }, 502)
    }

    try {
      const cleaned = raw.replace(/```json|```/g, '').trim()
      const data = JSON.parse(cleaned) as { ingredients?: unknown }
      const ingredients = Array.isArray(data.ingredients)
        ? data.ingredients.map((x) => String(x).trim()).filter(Boolean)
        : []
      return json({ ingredients })
    } catch {
      console.error('Parse failed', raw)
      return json({ error: 'AI returned invalid JSON' }, 502)
    }
  } catch (err) {
    console.error(err)
    return json(
      { error: err instanceof Error ? err.message : 'Unexpected server error' },
      500,
    )
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
