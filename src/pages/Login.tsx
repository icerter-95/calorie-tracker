/**
 * Login / sign-up screen. Username+passcode or email+password, plus a list of
 * accounts already saved on this device for one-tap switch.
 */
import { useState } from 'react'
import { AuthEmailNotConfirmedError, useAuth } from '../auth/AuthProvider'
import UserAvatar from '../components/UserAvatar'
import Button from '../components/ui/Button'

type SignInMethod = 'email' | 'username'

export default function LoginPage() {
  const {
    configured,
    signIn,
    signInWithUsername,
    signUp,
    resendSignupConfirmation,
    savedAccounts,
    emailAuthNotice,
    switchAccount,
    removeSavedAccountFromDevice,
  } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [signInMethod, setSignInMethod] = useState<SignInMethod>('username')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(
    emailAuthNotice?.kind === 'error' ? emailAuthNotice.message : null,
  )
  const [info, setInfo] = useState<string | null>(
    emailAuthNotice?.kind === 'confirmed' ? emailAuthNotice.message : null,
  )
  const [busy, setBusy] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState<string | null>(null)
  const [resendBusy, setResendBusy] = useState(false)

  // Shown when .env.local is missing Supabase keys.
  if (!configured) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4">
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

  // Sign in (username or email) or create an account.
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
        const result = await signUp(email.trim(), password, username)
        if (result.needsEmailConfirmation) {
          setPendingConfirmEmail(email.trim())
          setInfo(`Check ${email.trim()} and click the confirmation link, then sign in.`)
          setMode('signin')
          setSignInMethod('email')
        }
      }
    } catch (err) {
      if (err instanceof AuthEmailNotConfirmedError) {
        setPendingConfirmEmail(err.email)
        setError(err.message)
        setSignInMethod('email')
      } else {
        setError(err instanceof Error ? err.message : 'Authentication failed')
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleResendConfirmation() {
    const target = pendingConfirmEmail || email.trim()
    if (!target) {
      setError('Enter the email you signed up with.')
      return
    }
    setError(null)
    setResendBusy(true)
    try {
      await resendSignupConfirmation(target)
      setPendingConfirmEmail(target)
      setInfo(`Confirmation email sent to ${target}.`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not resend. Wait a few minutes and try again (Supabase allows 2 emails per hour).',
      )
    } finally {
      setResendBusy(false)
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
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-8">
      {/* If we left an account to add another, offer to go back */}
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
          {/* One-tap switch using tokens saved on this device */}
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

      {/* Email or username form for a new / restored session */}
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
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
            />
            {mode === 'signup' && (
              <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">
                We will send a confirmation link to this address. Each email must be unique.
              </span>
            )}
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
        {pendingConfirmEmail && (
          <button
            type="button"
            disabled={busy || resendBusy || Boolean(switchingId)}
            onClick={() => void handleResendConfirmation()}
            className="w-full text-sm text-teal-800 hover:text-teal-950 disabled:opacity-60 dark:text-teal-400 dark:hover:text-teal-200"
          >
            {resendBusy ? 'Sending…' : 'Resend confirmation email'}
          </button>
        )}

        <Button
          type="submit"
          disabled={busy || Boolean(switchingId)}
          busy={busy}
          busyLabel="Please wait…"
          className="w-full"
        >
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </Button>

        <button
          type="button"
          disabled={Boolean(switchingId)}
          onClick={() => {
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
            setError(null)
            setInfo(null)
            setPendingConfirmEmail(null)
          }}
          className="w-full text-sm text-stone-600 hover:text-stone-900 disabled:opacity-60 dark:text-stone-400 dark:hover:text-stone-200"
        >
          {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
