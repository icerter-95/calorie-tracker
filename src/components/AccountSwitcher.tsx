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
        className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-stone-200 transition hover:bg-stone-50 disabled:opacity-60 dark:bg-stone-900 dark:ring-stone-700 dark:hover:bg-stone-800"
      >
        <UserAvatar name={displayName} avatarUrl={avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-stone-900 dark:text-stone-50">
            {displayName}
          </p>
          <p className="truncate text-xs text-stone-500 dark:text-stone-400">
            Tap to switch account
          </p>
        </div>
        <span
          aria-hidden
          className={`inline-block h-2 w-2 shrink-0 border-b-2 border-r-2 border-stone-400 transition-transform dark:border-stone-500 ${open ? 'rotate-[225deg]' : 'rotate-45'}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-stone-200 dark:bg-stone-800 dark:ring-stone-600"
        >
          <div className="px-3 pb-1 pt-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Current
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5">
            <UserAvatar name={displayName} avatarUrl={avatarUrl} size="sm" className="!h-8 !w-8 !text-[10px]" />
            <span className="min-w-0 truncate text-sm font-medium text-stone-800 dark:text-stone-100">
              {displayName}
            </span>
          </div>

          {otherAccounts.length > 0 && (
            <div className="px-3 pb-1 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
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
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left hover:bg-stone-50 disabled:opacity-60 dark:hover:bg-stone-700"
              >
                <UserAvatar
                  name={account.displayName || account.email}
                  avatarUrl={account.avatarUrl}
                  size="sm"
                  tone="muted"
                  className="!h-8 !w-8 !text-[10px]"
                />
                <span className="min-w-0 truncate text-sm font-medium text-stone-800 dark:text-stone-100">
                  {account.displayName || 'Account'}
                </span>
              </button>
              <button
                type="button"
                disabled={busy}
                aria-label={`Remove ${account.displayName || account.email} from this device`}
                onClick={() => removeSavedAccountFromDevice(account.userId)}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-700"
              >
                ✕
              </button>
            </div>
          ))}

          <div className="my-1 border-t border-stone-100 dark:border-stone-700" />

          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => {
              setOpen(false)
              void handleAddAccount()
            }}
            className="block w-full px-3 py-2 text-left text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-60 dark:text-teal-400 dark:hover:bg-teal-950/30"
          >
            Add another account
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>
      )}
    </div>
  )
}
