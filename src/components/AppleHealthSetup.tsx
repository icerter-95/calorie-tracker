import { useCallback, useEffect, useState } from 'react'
import {
  deleteHealthSyncToken,
  fetchHealthSyncTokenInfo,
  getHealthSyncEndpoint,
  getSupabaseAnonKey,
  rotateHealthSyncToken,
} from '../db'
import type { HealthSyncTokenInfo } from '../types'

function formatSyncTime(ts?: number) {
  if (!ts) return null
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
}

export default function AppleHealthSetup() {
  const [info, setInfo] = useState<HealthSyncTokenInfo | null | undefined>(undefined)
  const [plaintextToken, setPlaintextToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  const endpoint = getHealthSyncEndpoint()
  const anonKey = getSupabaseAnonKey()

  const reload = useCallback(async () => {
    try {
      setError(null)
      const next = await fetchHealthSyncTokenInfo()
      setInfo(next)
    } catch (err) {
      setInfo(null)
      setError(err instanceof Error ? err.message : 'Could not load sync status')
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleGenerate() {
    const replacing = Boolean(info)
    if (
      replacing &&
      !window.confirm(
        'Replace your sync token? Your existing Shortcut will stop working until you paste the new token.',
      )
    ) {
      return
    }

    setBusy(true)
    setError(null)
    setCopied(null)
    try {
      const token = await rotateHealthSyncToken()
      setPlaintextToken(token)
      await reload()
      setShowGuide(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create sync token')
    } finally {
      setBusy(false)
    }
  }

  async function handleDisconnect() {
    if (!window.confirm('Remove the Apple Health sync token from this account?')) return
    setBusy(true)
    setError(null)
    try {
      await deleteHealthSyncToken()
      setPlaintextToken(null)
      setInfo(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove sync token')
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy(label: string, value: string) {
    try {
      await copyText(value)
      setCopied(label)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      setError('Could not copy — select the text manually')
    }
  }

  const lastSync = formatSyncTime(info?.lastUsedAt)
  const connected = Boolean(info)

  return (
    <li className="space-y-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-stone-900 dark:text-stone-50">Apple Health</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Automatic Shortcut sync for weight and steps
          </p>
          {connected && (
            <p className="mt-1 text-xs text-teal-700 dark:text-teal-400">
              {lastSync ? `Last sync · ${lastSync}` : 'Token ready · waiting for first sync'}
              {info?.tokenPrefix ? ` · ${info.tokenPrefix}…` : ''}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void (connected ? handleDisconnect() : handleGenerate())}
          className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
            connected
              ? 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700'
              : 'bg-teal-700 text-white hover:bg-teal-800'
          }`}
        >
          {busy ? '…' : connected ? 'Disconnect' : 'Connect'}
        </button>
      </div>

      {connected && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleGenerate()}
            className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
          >
            Regenerate token
          </button>
          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/40"
          >
            {showGuide ? 'Hide setup' : 'Show setup guide'}
          </button>
        </div>
      )}

      {plaintextToken && (
        <div className="space-y-2 rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
          <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
            Copy this token now — it won’t be shown again
          </p>
          <code className="block break-all text-xs text-amber-950 dark:text-amber-100">
            {plaintextToken}
          </code>
          <button
            type="button"
            onClick={() => void handleCopy('token', plaintextToken)}
            className="text-xs font-medium text-amber-900 underline dark:text-amber-200"
          >
            {copied === 'token' ? 'Copied' : 'Copy token'}
          </button>
        </div>
      )}

      {showGuide && endpoint && anonKey && (
        <div className="space-y-3 border-t border-stone-200 pt-3 text-sm text-stone-600 dark:border-stone-700 dark:text-stone-300">
          <p className="font-medium text-stone-800 dark:text-stone-100">What the Shortcut sends</p>
          <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed">
            <li>
              <strong>Weight:</strong> latest Body Mass in Health + that sample’s own date (not
              “today” — so skipped weigh-in days don’t create fake rows)
            </li>
            <li>
              <strong>Steps:</strong> full step total for yesterday
            </li>
          </ul>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Build a Shortcut named “Sync Health to Calorie Tracker”, test it once, then attach a
            Time of Day Automation (Ask Before Running off). Exact tap-by-tap steps are in chat /
            your setup notes for iOS 26.
          </p>
          <p className="text-xs font-medium text-stone-800 dark:text-stone-100">JSON body shape</p>
          <code className="block whitespace-pre-wrap break-all rounded-lg bg-stone-100 px-2 py-1.5 text-[10px] text-stone-700 dark:bg-stone-800 dark:text-stone-200">{`{
  "weight_kg": 78.4,
  "weight_date": "2026-07-30",
  "steps": 8421,
  "steps_date": "2026-08-01"
}`}</code>

          <CopyRow
            label="Sync URL"
            value={endpoint}
            copied={copied === 'url'}
            onCopy={() => void handleCopy('url', endpoint)}
          />
          <CopyRow
            label="Anon key (apikey + Bearer)"
            value={anonKey}
            copied={copied === 'anon'}
            onCopy={() => void handleCopy('anon', anonKey)}
          />
          <p className="text-xs text-stone-500 dark:text-stone-400">
            The anon key is safe in the Shortcut (same key the website uses). Keep your personal
            sync token private.
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </li>
  )
}

function CopyRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-stone-700 dark:text-stone-200">{label}</p>
        <button
          type="button"
          onClick={onCopy}
          className="text-xs font-medium text-teal-700 dark:text-teal-400"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <code className="block break-all rounded-lg bg-stone-100 px-2 py-1.5 text-[10px] text-stone-700 dark:bg-stone-800 dark:text-stone-200">
        {value}
      </code>
    </div>
  )
}
