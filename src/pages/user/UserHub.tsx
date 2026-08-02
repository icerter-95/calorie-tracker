import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import AccountSwitcher from '../../components/AccountSwitcher'

type UserLocationState = {
  from?: string
}

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
    description: 'Apple Health and other sync',
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

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
        {SECTIONS.map((section, index) => (
          <div key={section.to}>
            {index > 0 && (
              <div className="border-t border-stone-100 dark:border-stone-800" />
            )}
            <Link
              to={section.to}
              state={{ from: fromPath }}
              className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-stone-900 dark:text-stone-50">
                  {section.title}
                </span>
                <span className="block truncate text-xs text-stone-500 dark:text-stone-400">
                  {section.description}
                </span>
              </span>
              <span aria-hidden className="shrink-0 text-stone-400">
                →
              </span>
            </Link>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleSignOut()}
          className="w-full rounded-2xl bg-white py-3 text-sm font-medium text-stone-800 shadow-sm ring-1 ring-stone-200 hover:bg-stone-50 disabled:opacity-60 dark:bg-stone-900 dark:text-stone-100 dark:ring-stone-700 dark:hover:bg-stone-800"
        >
          Sign out of this account
        </button>
        {savedAccounts.length > 1 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSignOutAll()}
            className="w-full rounded-2xl bg-white py-3 text-sm font-medium text-red-600 shadow-sm ring-1 ring-stone-200 hover:bg-red-50 disabled:opacity-60 dark:bg-stone-900 dark:text-red-400 dark:ring-stone-700 dark:hover:bg-red-950/40"
          >
            Sign out of all accounts on this device
          </button>
        )}
        <p className="text-center text-xs text-stone-400 dark:text-stone-500">
          Calorie Tracker · v0.1.0 · synced with Supabase
        </p>
      </section>
    </div>
  )
}
