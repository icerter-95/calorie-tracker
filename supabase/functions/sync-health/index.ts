// Supabase Edge Function — Apple Shortcuts → upsert weight + steps
// Deploy: npx supabase functions deploy sync-health
//
// Body options (any combination):
//   { "weight_kg", "weight_date" }
//   { "weight_days": [ { "date", "weight_kg" }, ... ] }
//   { "steps", "steps_date" }
//   { "steps_days": [ { "date", "steps" }, ... ] }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-health-sync-token',
}

type DayNumber = {
  date?: string
  steps?: number
  weight_kg?: number
}

type SyncBody = {
  weight_kg?: number
  weight_date?: string
  weight_days?: DayNumber[]
  steps?: number
  steps_date?: string
  steps_days?: DayNumber[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Server misconfigured (Supabase env)' }, 500)
    }

    const syncToken = req.headers.get('x-health-sync-token')?.trim()
    if (!syncToken) {
      return json({ error: 'Missing x-health-sync-token header' }, 401)
    }

    const tokenHash = await sha256Hex(syncToken)
    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: tokenRow, error: tokenError } = await admin
      .from('health_sync_tokens')
      .select('user_id')
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (tokenError) throw tokenError
    if (!tokenRow?.user_id) {
      return json({ error: 'Invalid sync token' }, 401)
    }

    const userId = tokenRow.user_id as string
    const body = (await req.json()) as SyncBody

    const weightDays = normalizeWeightDays(body)
    const stepsDays = normalizeStepsDays(body)
    const hasWeight = weightDays.length > 0
    const hasSteps = stepsDays.length > 0

    if (!hasWeight && !hasSteps) {
      return json(
        {
          error:
            'Provide weight_kg+weight_date, weight_days[], steps+steps_date, and/or steps_days[]',
        },
        400,
      )
    }

    const nowIso = new Date().toISOString()
    const result: {
      weight?: { date: string; weight_kg: number }[]
      steps?: { date: string; steps: number }[]
    } = {}

    if (hasWeight) {
      for (const day of weightDays) {
        const { data: existing } = await admin
          .from('weights')
          .select('id')
          .eq('user_id', userId)
          .eq('date', day.date)
          .eq('source', 'apple-health')
          .maybeSingle()

        if (existing?.id) {
          const { error: updateError } = await admin
            .from('weights')
            .update({
              weight_kg: day.weight_kg,
              synced_at: nowIso,
            })
            .eq('id', existing.id)
          if (updateError) throw updateError
        } else {
          const { error: insertError } = await admin.from('weights').insert({
            user_id: userId,
            date: day.date,
            weight_kg: day.weight_kg,
            source: 'apple-health',
            synced_at: nowIso,
          })
          if (insertError) throw insertError
        }
      }
      result.weight = weightDays
    }

    if (hasSteps) {
      const rows = stepsDays.map((day) => ({
        user_id: userId,
        date: day.date,
        steps: day.steps,
        source: 'apple-health' as const,
        synced_at: nowIso,
      }))

      const { error: stepsError } = await admin.from('steps').upsert(rows, {
        onConflict: 'user_id,date',
      })
      if (stepsError) throw stepsError

      result.steps = stepsDays
    }

    await admin
      .from('health_sync_tokens')
      .update({ last_used_at: nowIso })
      .eq('user_id', userId)

    return json({ ok: true, synced_at: nowIso, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return json({ error: message }, 500)
  }
})

function normalizeWeightDays(body: SyncBody): { date: string; weight_kg: number }[] {
  const out: { date: string; weight_kg: number }[] = []
  const seen = new Set<string>()

  if (Array.isArray(body.weight_days)) {
    for (const item of body.weight_days) {
      const date = String(item?.date ?? '')
      const weightKg = round1(Number(item?.weight_kg))
      if (!isDateKey(date) || !Number.isFinite(weightKg) || weightKg <= 0) continue
      if (seen.has(date)) continue
      seen.add(date)
      out.push({ date, weight_kg: weightKg })
    }
  }

  if (body.weight_kg != null && body.weight_date) {
    const date = String(body.weight_date)
    const weightKg = round1(Number(body.weight_kg))
    if (isDateKey(date) && Number.isFinite(weightKg) && weightKg > 0 && !seen.has(date)) {
      out.push({ date, weight_kg: weightKg })
    }
  }

  return out
}

function normalizeStepsDays(body: SyncBody): { date: string; steps: number }[] {
  const out: { date: string; steps: number }[] = []
  const seen = new Set<string>()

  if (Array.isArray(body.steps_days)) {
    for (const item of body.steps_days) {
      const date = String(item?.date ?? '')
      const steps = Math.round(Number(item?.steps))
      if (!isDateKey(date) || !Number.isFinite(steps) || steps < 0) continue
      if (seen.has(date)) continue
      seen.add(date)
      out.push({ date, steps })
    }
  }

  if (body.steps != null && body.steps_date) {
    const date = String(body.steps_date)
    const steps = Math.round(Number(body.steps))
    if (isDateKey(date) && Number.isFinite(steps) && steps >= 0 && !seen.has(date)) {
      out.push({ date, steps })
    }
  }

  return out
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
