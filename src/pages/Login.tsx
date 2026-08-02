import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import UserAvatar from '../components/UserAvatar'

type SignInMethod = 'email' | 'username'

export default function LoginPage() {
  const {
    configured,
    signIn,
    signInWithUsername,
    signUp,
    savedAccounts,
    switchAccount,
    removeSavedAccountFromDevice,
  } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [signInMethod, setSignInMethod] = useState<SignInMethod>('username')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  if (!configured) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4">
        <div className="space-y-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Setup required</h1>
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Add your Supabase keys to <code className="rounded bg-stone-100 px-1 dark:bg-stone-800">.env.local</code>,
            then restart the dev server.
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-600 dark:text-stone-300">
            <li>Create a project at supabase.com</li>
            <li>Run <code className="rounded bg-stone-100 px-1 dark:bg-stone-800">supabase/schema.sql</code> in the SQL Editor</li>
            <li>
              Copy URL + publishable/anon key into{' '}
              <code className="rounded bg-stone-100 px-1 dark:bg-stone-800">.env.local</code>
            </li>
          </ol>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        if (signInMethod === 'username') {
          await signInWithUsername(username, password)
        } else {
          await signIn(email.trim(), password)
        }
      } else {
        if (!username.trim()) {
          setError('Please enter a username.')
          return
        }
        await signUp(email.trim(), password, username)
        setInfo(
          'Account created. If email confirmation is enabled in Supabase, check your inbox before signing in.',
        )
        setMode('signin')
        setSignInMethod('username')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleSwitch(userId: string) {
    setError(null)
    setSwitchingId(userId)
    try {
      await switchAccount(userId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not switch account')
    } finally {
      setSwitchingId(null)
    }
  }

  const usingUsername = mode === 'signin' && signInMethod === 'username'
  // Most recent saved account (the one you left when adding another).
  const backAccount = savedAccounts[0] ?? null
  const backLabel = backAccount?.displayName || backAccount?.email || 'previous account'

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-8">
      {backAccount && (
        <div className="mb-4">
          <button
            type="button"
            disabled={Boolean(switchingId)}
            onClick={() => void handleSwitch(backAccount.userId)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-teal-800 disabled:opacity-60"
          >
            <span aria-hidden>←</span>
            {switchingId === backAccount.userId
              ? 'Going back…'
              : `Cancel — back to ${backLabel}`}
          </button>
        </div>
      )}

      {savedAccounts.length > 0 && (
        <section className="mb-4 space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-50">
            Continue as
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Tap a saved account to switch without typing the password again.
          </p>
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {savedAccounts.map((account) => (
              <li key={account.userId} className="flex items-center gap-2 py-2">
                <button
                  type="button"
                  disabled={Boolean(switchingId)}
                  onClick={() => void handleSwitch(account.userId)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left hover:bg-stone-50 disabled:opacity-60 dark:hover:bg-stone-800"
                >
                  <UserAvatar
                    name={account.displayName || account.email}
                    avatarUrl={account.avatarUrl}
                    size="sm"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-stone-900 dark:text-stone-50">
                      {switchingId === account.userId
                        ? 'Switching…'
                        : account.displayName || 'Account'}
                    </span>
                    <span className="block truncate text-xs text-stone-500 dark:text-stone-400">
                      {account.email}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={Boolean(switchingId)}
                  onClick={() => removeSavedAccountFromDevice(account.userId)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
                  aria-label={`Remove ${account.email} from this device`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700"
      >
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Calorie Tracker</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {savedAccounts.length > 0
              ? mode === 'signin'
                ? 'Or sign in to add / restore an account.'
                : 'Create another account (e.g. a demo for sample data).'
              : mode === 'signin'
                ? 'Sign in to sync your meals across devices.'
                : 'Create your account.'}
          </p>
        </div>

        {mode === 'signin' && (
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-800">
            <button
              type="button"
              onClick={() => {
                setSignInMethod('username')
                setError(null)
              }}
              className={`rounded-lg py-1.5 text-sm font-medium transition-colors ${
                signInMethod === 'username'
                  ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-50'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              Username
            </button>
            <button
              type="button"
              onClick={() => {
                setSignInMethod('email')
                setError(null)
              }}
              className={`rounded-lg py-1.5 text-sm font-medium transition-colors ${
                signInMethod === 'email'
                  ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-50'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              Email
            </button>
          </div>
        )}

        {(mode === 'signup' || usingUsername) && (
          <label className="block text-sm">
            <span className="mb-1 block text-stone-600 dark:text-stone-300">Username</span>
            <input
              type="text"
              required
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. ignasi"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
            />
            {mode === 'signup' && (
              <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">
                Your name in the app and for signing in. 3–20 chars, letters/numbers/_.
              </span>
            )}
          </label>
        )}

        {(mode === 'signup' || !usingUsername) && (
          <label className="block text-sm">
            <span className="mb-1 block text-stone-600 dark:text-stone-300">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
            />
          </label>
        )}

        <label className="block text-sm">
          <span className="mb-1 block text-stone-600 dark:text-stone-300">
            {usingUsername ? 'Passcode' : 'Password'}
          </span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
          />
          {usingUsername && (
            <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">
              Same as your account password. Change it in Profile → Account info.
            </span>
          )}
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {info && <p className="text-sm text-teal-700 dark:text-teal-400">{info}</p>}

        <button
          type="submit"
          disabled={busy || Boolean(switchingId)}
          className="w-full rounded-xl bg-teal-700 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        <button
          type="button"
          disabled={Boolean(switchingId)}
          onClick={() => {
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
            setError(null)
            setInfo(null)
          }}
          className="w-full text-sm text-stone-600 hover:text-stone-900 disabled:opacity-60 dark:text-stone-400 dark:hover:text-stone-200"
        >
          {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
