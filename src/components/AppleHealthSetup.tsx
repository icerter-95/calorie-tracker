/**
 * Apple Health connection card. Creates a one-time sync token and shows the
 * Shortcut URL / anon key / JSON shape to paste into iOS Shortcuts.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  deleteHealthSyncToken,
  fetchHealthSyncTokenInfo,
  getHealthSyncEndpoint,
  getSupabaseAnonKey,
  rotateHealthSyncToken,
} from '../db'
import type { HealthSyncTokenInfo } from '../types'
import Button from './ui/Button'

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
    <li className="space-y-3 rounded-2xl bg-raised px-4 py-3 ring-1 ring-line">
      {/* Status + Connect / Disconnect */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-content">Apple Health</p>
          <p className="text-sm text-content-subtle">
            Automatic Shortcut sync for weight and steps
          </p>
          {connected && (
            <p className="mt-1 text-xs text-accent-ink">
              {lastSync ? `Last sync · ${lastSync}` : 'Token ready · waiting for first sync'}
              {info?.tokenPrefix ? ` · ${info.tokenPrefix}…` : ''}
            </p>
          )}
        </div>
        <Button
          variant={connected ? 'secondary' : 'primary'}
          disabled={busy}
          busy={busy}
          busyLabel="…"
          onClick={() => void (connected ? handleDisconnect() : handleGenerate())}
          className="shrink-0"
        >
          {connected ? 'Disconnect' : 'Connect'}
        </Button>
      </div>

      {connected && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleGenerate()}
            className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-content-muted hover:bg-hover"
          >
            Regenerate token
          </button>
          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent-ink hover:bg-accent-soft"
          >
            {showGuide ? 'Hide setup' : 'Show setup guide'}
          </button>
        </div>
      )}

      {plaintextToken && (
        <div className="space-y-2 rounded-xl bg-health-soft px-3 py-2">
          {/* Shown once after generate — copy into the Shortcut */}
          <p className="text-xs font-medium text-health-ink">
            Copy this token now — it won’t be shown again
          </p>
          <code className="block break-all text-xs text-health-ink">
            {plaintextToken}
          </code>
          <button
            type="button"
            onClick={() => void handleCopy('token', plaintextToken)}
            className="text-xs font-medium text-health-ink underline"
          >
            {copied === 'token' ? 'Copied' : 'Copy token'}
          </button>
        </div>
      )}

      {showGuide && endpoint && anonKey && (
        <div className="space-y-3 border-t border-line pt-3 text-sm text-content-muted">
          {/* JSON shape + copyable URL / anon key for the Shortcut */}
          <p className="font-medium text-content">What the Shortcut sends</p>
          <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed">
            <li>
              <strong>Steps:</strong> today’s cumulative step total from Apple Health (upserts the
              same day — later runs overwrite with a higher count). History is not sent unless you
              run a last-30-days sync.
            </li>
            <li>
              <strong>Weight (optional):</strong> latest Body Mass + that sample’s own date
            </li>
          </ul>
          <p className="text-xs text-content-subtle">
            Build a Shortcut named “Sync Today Steps”, test it once, then add three Time of Day
            Automations (e.g. 12:00 / 18:00 / 22:00) with Ask Before Running off. Tap-by-tap steps
            are in chat for iOS 26.
          </p>
          <p className="text-xs font-medium text-content">JSON body shape</p>
          <code className="block whitespace-pre-wrap break-all rounded-lg bg-muted px-2 py-1.5 text-[10px] text-content-muted">{`{
  "steps": 8421,
  "steps_date": "YYYY-MM-DD"
}`}</code>
          <p className="text-xs font-medium text-content">
            Success looks like this (from Get Contents of URL, not the Text JSON)
          </p>
          <code className="block whitespace-pre-wrap break-all rounded-lg bg-muted px-2 py-1.5 text-[10px] text-content-muted">{`{
  "ok": true,
  "steps": [{ "date": "YYYY-MM-DD", "steps": 8421 }]
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
          <p className="text-xs text-content-subtle">
            The anon key is safe in the Shortcut (same key the website uses). Keep your personal
            sync token private.
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}
    </li>
  )
}

/** Copyable URL / key row used in the Shortcut setup guide. */
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
        <p className="text-xs font-medium text-content-muted">{label}</p>
        <button
          type="button"
          onClick={onCopy}
          className="text-xs font-medium text-accent-ink"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <code className="block break-all rounded-lg bg-muted px-2 py-1.5 text-[10px] text-content-muted">
        {value}
      </code>
    </div>
  )
}
