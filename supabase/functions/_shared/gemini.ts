/** Shared Gemini generateContent helpers for Edge Functions. */

export const PRIMARY_MODEL =
  Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite'

/** Older Flash models tend to have more spare capacity when a new model is overloaded. */
const DEFAULT_FALLBACKS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash']

export function modelChain(): string[] {
  const fromEnv = (Deno.env.get('GEMINI_FALLBACK_MODELS') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const fallbacks = fromEnv.length > 0 ? fromEnv : DEFAULT_FALLBACKS
  const seen = new Set<string>()
  const chain: string[] = []
  for (const model of [PRIMARY_MODEL, ...fallbacks]) {
    if (!seen.has(model)) {
      seen.add(model)
      chain.push(model)
    }
  }
  return chain
}

export type GeminiOk = {
  ok: true
  model: string
  json: Record<string, unknown>
}

export type GeminiFail = {
  ok: false
  status: number
  errText: string
  model: string
}

const RETRIES_PER_MODEL = 2
const BASE_DELAY_MS = 400

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTransientStatus(status: number): boolean {
  return status === 503 || status === 500 || status === 408
}

/**
 * Call generateContent, retrying transient overload errors and falling back
 * across model IDs when the primary model is capacity-constrained.
 */
export async function generateContentWithFallback(
  geminiKey: string,
  body: Record<string, unknown>,
): Promise<GeminiOk | GeminiFail> {
  let lastFail: GeminiFail | null = null

  for (const model of modelChain()) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
      `?key=${encodeURIComponent(geminiKey)}`

    for (let attempt = 0; attempt <= RETRIES_PER_MODEL; attempt++) {
      if (attempt > 0) {
        await sleep(BASE_DELAY_MS * 2 ** (attempt - 1))
      }

      let geminiRes: Response
      try {
        geminiRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } catch (err) {
        console.error('Gemini fetch failed', model, err)
        lastFail = {
          ok: false,
          status: 503,
          errText: err instanceof Error ? err.message : 'Network error calling Gemini',
          model,
        }
        continue
      }

      if (geminiRes.ok) {
        const json = (await geminiRes.json()) as Record<string, unknown>
        if (model !== PRIMARY_MODEL) {
          console.log(`Gemini succeeded with fallback model ${model}`)
        }
        return { ok: true, model, json }
      }

      const errText = await geminiRes.text()
      console.error('Gemini error', model, geminiRes.status, errText)
      lastFail = {
        ok: false,
        status: geminiRes.status,
        errText,
        model,
      }

      // Don't burn retries/fallbacks on auth / bad-request / not-found.
      if (
        geminiRes.status === 400 ||
        geminiRes.status === 401 ||
        geminiRes.status === 403 ||
        geminiRes.status === 404
      ) {
        return lastFail
      }

      // Rate limit: brief pause then try same model once more, then next model.
      if (geminiRes.status === 429) {
        if (attempt < RETRIES_PER_MODEL) {
          await sleep(1200 * (attempt + 1))
          continue
        }
        break
      }

      if (isTransientStatus(geminiRes.status)) {
        // Retry same model, then fall through to next model.
        continue
      }

      // Unknown non-transient error — stop.
      return lastFail
    }
  }

  return (
    lastFail || {
      ok: false,
      status: 503,
      errText: 'All Gemini models unavailable',
      model: PRIMARY_MODEL,
    }
  )
}

export function summarizeGeminiError(status: number, errText: string): string {
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
  if (status === 503 || /high demand|UNAVAILABLE|overloaded/i.test(short)) {
    return 'AI is busy right now (tried backup models too). Wait a minute and try again, or fill in values manually.'
  }
  if (status === 429) {
    return 'Gemini free-tier limit reached. Wait 1–2 minutes and try once more. If it keeps failing, wait until tomorrow (quota resets daily) or enter values manually.'
  }
  return `AI request failed (${status}): ${short}`
}

export function candidateText(geminiJson: Record<string, unknown>): string | undefined {
  const candidates = geminiJson?.candidates as
    | Array<{ content?: { parts?: Array<{ text?: string }> } }>
    | undefined
  return candidates?.[0]?.content?.parts?.[0]?.text
}

export function blockReason(geminiJson: Record<string, unknown>): string | undefined {
  const feedback = geminiJson?.promptFeedback as { blockReason?: string } | undefined
  return feedback?.blockReason
}
