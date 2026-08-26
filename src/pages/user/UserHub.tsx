/**
 * Profile hub. Account switcher, links to settings pages, and sign-out.
 */
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import AccountSwitcher from '../../components/AccountSwitcher'

type UserLocationState = {
  from?: string
}

// Links shown on the profile hub (each opens a nested settings page).
const SECTIONS = [
  {
    to: 'account',
    title: 'Account info',
    description: 'Username, password, photo',
  },
  {
    to: 'appearance',
    title: 'Appearance',
    description: 'Light, dark, or system theme',
  },
  {
    to: 'goals',
    title: 'Goals',
    description: 'Calories and macros',
  },
  {
    to: 'connections',
    title: 'Connections',
    description: 'Apple Health sync',
  },
  {
    to: 'data',
    title: 'Data',
    description: 'Backfill, sample data, clear cloud',
  },
] as const

export default function UserHub() {
  const { signOut, signOutAll, savedAccounts } = useAuth()
  const location = useLocation()
  const fromPath = (location.state as UserLocationState | null)?.from
  const [busy, setBusy] = useState(false)

  async function handleSignOut() {
    setBusy(true)
    try {
      await signOut()
    } finally {
      setBusy(false)
    }
  }

  async function handleSignOutAll() {
    setBusy(true)
    try {
      await signOutAll()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <AccountSwitcher />

      {/* Settings list */}
      <section className="overflow-hidden rounded-2xl bg-raised shadow-sm ring-1 ring-line">
        {SECTIONS.map((section, index) => (
          <div key={section.to}>
            {index > 0 && (
              <div className="border-t border-divider" />
            )}
            <Link
              to={section.to}
              state={{ from: fromPath }}
              className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-hover"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-content">
                  {section.title}
                </span>
                <span className="block truncate text-xs text-content-subtle">
                  {section.description}
                </span>
              </span>
              <span aria-hidden className="shrink-0 text-content-faint">
                →
              </span>
            </Link>
          </div>
        ))}
      </section>

      {/* Sign out this account, or every account saved on this phone */}
      <section className="space-y-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleSignOut()}
          className="w-full rounded-2xl bg-raised py-3 text-sm font-medium text-content shadow-sm ring-1 ring-line hover:bg-hover disabled:opacity-60"
        >
          Sign out of this account
        </button>
        {savedAccounts.length > 1 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSignOutAll()}
            className="w-full rounded-2xl bg-raised py-3 text-sm font-medium text-danger shadow-sm ring-1 ring-line hover:bg-danger-soft disabled:opacity-60"
          >
            Sign out of all accounts on this device
          </button>
        )}
        <p className="text-center text-xs text-content-faint">
          Calorie Tracker · v0.1.0 · synced with Supabase
        </p>
      </section>
    </div>
  )
}
