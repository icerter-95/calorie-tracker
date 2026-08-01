import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'

export default function LoginPage() {
  const { configured, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
        await signIn(email.trim(), password)
      } else {
        const name = displayName.trim()
        if (!name) {
          setError('Please enter your name.')
          return
        }
        await signUp(email.trim(), password, name)
        setInfo(
          'Account created. If email confirmation is enabled in Supabase, check your inbox before signing in.',
        )
        setMode('signin')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700"
      >
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Calorie Tracker</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {mode === 'signin' ? 'Sign in to sync your meals across devices.' : 'Create your account.'}
          </p>
        </div>

        {mode === 'signup' && (
          <label className="block text-sm">
            <span className="mb-1 block text-stone-600 dark:text-stone-300">Name</span>
            <input
              type="text"
              required
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Ignasi"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
            />
          </label>
        )}

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

        <label className="block text-sm">
          <span className="mb-1 block text-stone-600 dark:text-stone-300">Password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
          />
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {info && <p className="text-sm text-teal-700 dark:text-teal-400">{info}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-teal-700 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
            setError(null)
            setInfo(null)
          }}
          className="w-full text-sm text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
        >
          {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
