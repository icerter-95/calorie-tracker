/**
 * Profile header that opens a menu to switch saved accounts or add another.
 */
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { getAvatarUrl, getDisplayName } from '../lib/userProfile'
import UserAvatar from './UserAvatar'

export default function AccountSwitcher() {
  const {
    user,
    savedAccounts,
    switchAccount,
    startAddAccount,
    removeSavedAccountFromDevice,
  } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const displayName = getDisplayName(user)
  const avatarUrl = getAvatarUrl(user)
  const otherAccounts = savedAccounts.filter((a) => a.userId !== user?.id)

  // Close the menu when tapping outside.
  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  async function handleSwitchAccount(userId: string) {
    setError(null)
    setBusy(true)
    try {
      // Reload the app after switching so all data hooks pick up the new user.
      await switchAccount(userId)
      window.location.assign(`${import.meta.env.BASE_URL}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not switch account')
      setBusy(false)
    }
  }

  async function handleAddAccount() {
    setError(null)
    setBusy(true)
    try {
      await startAddAccount()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start add account')
      setBusy(false)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Switch account"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-2xl bg-raised px-4 py-3 text-left ring-1 ring-line transition hover:bg-hover disabled:opacity-60"
      >
        <UserAvatar name={displayName} avatarUrl={avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-content">
            {displayName}
          </p>
          <p className="truncate text-xs text-content-subtle">
            Tap to switch account
          </p>
        </div>
        <span
          aria-hidden
          className={`inline-block h-2 w-2 shrink-0 border-b-2 border-r-2 border-content-faint transition-transform ${open ? 'rotate-[225deg]' : 'rotate-45'}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl bg-field py-1 shadow-lg ring-1 ring-line"
        >
          {/* Current account, other saved accounts, then "Add another" */}
          <div className="px-3 pb-1 pt-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-content-faint">
              Current
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5">
            <UserAvatar name={displayName} avatarUrl={avatarUrl} size="sm" className="!h-8 !w-8 !text-[10px]" />
            <span className="min-w-0 truncate text-sm font-medium text-content">
              {displayName}
            </span>
          </div>

          {otherAccounts.length > 0 && (
            <div className="px-3 pb-1 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-content-faint">
                Switch account
              </p>
            </div>
          )}
          {otherAccounts.map((account) => (
            <div key={account.userId} className="flex items-center gap-1 px-1.5" role="none">
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={() => {
                  setOpen(false)
                  void handleSwitchAccount(account.userId)
                }}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left hover:bg-hover disabled:opacity-60"
              >
                <UserAvatar
                  name={account.displayName || account.email}
                  avatarUrl={account.avatarUrl}
                  size="sm"
                  tone="muted"
                  className="!h-8 !w-8 !text-[10px]"
                />
                <span className="min-w-0 truncate text-sm font-medium text-content">
                  {account.displayName || 'Account'}
                </span>
              </button>
              <button
                type="button"
                disabled={busy}
                aria-label={`Remove ${account.displayName || account.email} from this device`}
                onClick={() => removeSavedAccountFromDevice(account.userId)}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-content-faint hover:bg-hover hover:text-content-muted"
              >
                ✕
              </button>
            </div>
          ))}

          <div className="my-1 border-t border-divider" />

          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => {
              setOpen(false)
              void handleAddAccount()
            }}
            className="block w-full px-3 py-2 text-left text-sm font-medium text-accent-ink hover:bg-accent-soft disabled:opacity-60"
          >
            Add another account
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-danger-strong">{error}</p>
      )}
    </div>
  )
}
