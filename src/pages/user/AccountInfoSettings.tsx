import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import UserAvatar from '../../components/UserAvatar'
import { getAvatarUrl, getDisplayName } from '../../lib/userProfile'

type Editor = 'username' | 'password' | null

export default function AccountInfoSettings() {
  const {
    user,
    updatePassword,
    getLoginUsername,
    setLoginUsername,
    removeLoginUsername,
    updateAvatar,
  } = useAuth()

  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [loginUsername, setLoginUsernameState] = useState<string | null>(null)
  const [usernameDraft, setUsernameDraft] = useState('')
  const [usernameBusy, setUsernameBusy] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameSaved, setUsernameSaved] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [openEditor, setOpenEditor] = useState<Editor>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setAvatarError(null)
    setOpenEditor(null)
    setUsernameError(null)
    setPasswordError(null)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }, [user])

  useEffect(() => {
    if (!user) {
      setLoginUsernameState(null)
      return
    }
    let cancelled = false
    void getLoginUsername()
      .then((name) => {
        if (!cancelled) {
          setLoginUsernameState(name)
          // Prefer login username; fall back to current display name for the draft.
          setUsernameDraft(name ?? getDisplayName(user))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoginUsernameState(null)
          setUsernameDraft(getDisplayName(user))
        }
      })
    return () => {
      cancelled = true
    }
  }, [user, getLoginUsername])

  const displayName = getDisplayName(user)
  const avatarUrl = getAvatarUrl(user)

  function closeEditor() {
    setOpenEditor(null)
    setUsernameError(null)
    setPasswordError(null)
    setUsernameDraft(loginUsername ?? displayName)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  function toggleEditor(editor: Exclude<Editor, null>) {
    if (openEditor === editor) {
      closeEditor()
      return
    }
    setUsernameError(null)
    setPasswordError(null)
    setUsernameDraft(loginUsername ?? displayName)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setOpenEditor(editor)
  }

  async function handleAvatarChange(file: File | undefined) {
    if (!file) return
    setAvatarError(null)
    setAvatarBusy(true)
    try {
      await updateAvatar(file)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Could not update photo')
    } finally {
      setAvatarBusy(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  async function handleUsernameSave() {
    setUsernameError(null)
    setUsernameBusy(true)
    try {
      const saved = await setLoginUsername(usernameDraft)
      setLoginUsernameState(saved)
      setUsernameDraft(saved)
      setOpenEditor(null)
      setUsernameSaved(true)
      window.setTimeout(() => setUsernameSaved(false), 1500)
    } catch (err) {
      setUsernameError(err instanceof Error ? err.message : 'Could not save username')
    } finally {
      setUsernameBusy(false)
    }
  }

  async function handleUsernameRemove() {
    if (!window.confirm('Remove username? You can still sign in with email.')) return
    setUsernameError(null)
    setUsernameBusy(true)
    try {
      await removeLoginUsername()
      setLoginUsernameState(null)
      setUsernameDraft('')
      setOpenEditor(null)
    } catch (err) {
      setUsernameError(err instanceof Error ? err.message : 'Could not remove username')
    } finally {
      setUsernameBusy(false)
    }
  }

  async function handlePasswordSave() {
    setPasswordError(null)
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }
    setPasswordBusy(true)
    try {
      await updatePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setOpenEditor(null)
      setPasswordSaved(true)
      window.setTimeout(() => setPasswordSaved(false), 1500)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Could not update password')
    } finally {
      setPasswordBusy(false)
    }
  }

  const rowClass =
    'flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60 dark:text-stone-100 dark:hover:bg-stone-800'
  const editorClass =
    'space-y-2 border-t border-stone-100 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-950/50'

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="relative shrink-0">
            <button
              type="button"
              disabled={avatarBusy}
              onClick={() => avatarInputRef.current?.click()}
              aria-label={avatarUrl ? 'Change profile photo' : 'Add profile photo'}
              className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-60"
            >
              <UserAvatar name={displayName} avatarUrl={avatarUrl} size="md" />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-[10px] font-medium text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                {avatarBusy ? '…' : 'Edit'}
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleAvatarChange(e.target.files?.[0])}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-stone-900 dark:text-stone-50">
              {displayName}
              {(usernameSaved || passwordSaved) && (
                <span className="ml-2 text-xs font-medium text-teal-700 dark:text-teal-400">
                  {passwordSaved ? 'Password updated' : 'Saved'}
                </span>
              )}
            </h2>
            <p className="truncate text-xs text-stone-500 dark:text-stone-400">{user?.email}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
        <button
          type="button"
          aria-expanded={openEditor === 'username'}
          disabled={usernameBusy}
          onClick={() => toggleEditor('username')}
          className={rowClass}
        >
          {loginUsername ? 'Edit username' : 'Set username'}
          <span
            aria-hidden
            className={`text-stone-400 transition-transform ${openEditor === 'username' ? 'rotate-90' : ''}`}
          >
            →
          </span>
        </button>
        {openEditor === 'username' && (
          <div className={editorClass}>
            <label className="block text-sm">
              <span className="mb-1 block text-stone-600 dark:text-stone-300">Username</span>
              <input
                type="text"
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={usernameDraft}
                onChange={(e) => setUsernameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleUsernameSave()
                  if (e.key === 'Escape') closeEditor()
                }}
                placeholder="e.g. ignasi"
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
              />
            </label>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              This is your name in the app and how you sign in (instead of email).
            </p>
            {usernameError && (
              <p className="text-xs text-red-600 dark:text-red-400">{usernameError}</p>
            )}
            <div className="flex flex-wrap justify-end gap-1.5">
              {loginUsername && (
                <button
                  type="button"
                  disabled={usernameBusy}
                  onClick={() => void handleUsernameRemove()}
                  className="mr-auto rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Remove
                </button>
              )}
              <button
                type="button"
                disabled={usernameBusy}
                onClick={closeEditor}
                className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={usernameBusy}
                onClick={() => void handleUsernameSave()}
                className="rounded-lg bg-teal-700 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {usernameBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-stone-100 dark:border-stone-800" />
        <button
          type="button"
          aria-expanded={openEditor === 'password'}
          disabled={passwordBusy}
          onClick={() => toggleEditor('password')}
          className={rowClass}
        >
          Change password
          <span
            aria-hidden
            className={`text-stone-400 transition-transform ${openEditor === 'password' ? 'rotate-90' : ''}`}
          >
            →
          </span>
        </button>
        {openEditor === 'password' && (
          <div className={editorClass}>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Used for email login and username passcode (min. 6 characters).
            </p>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-stone-600 dark:text-stone-300">
                Current password
              </span>
              <input
                type="password"
                autoFocus
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-stone-600 dark:text-stone-300">
                New password / passcode
              </span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-stone-600 dark:text-stone-300">
                Confirm new password
              </span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handlePasswordSave()
                  if (e.key === 'Escape') closeEditor()
                }}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
              />
            </label>
            {passwordError && (
              <p className="text-xs text-red-600 dark:text-red-400">{passwordError}</p>
            )}
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                disabled={passwordBusy}
                onClick={closeEditor}
                className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={passwordBusy || !currentPassword || !newPassword}
                onClick={() => void handlePasswordSave()}
                className="rounded-lg bg-teal-700 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {passwordBusy ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </div>
        )}
      </section>

      {avatarError && (
        <p className="text-sm text-red-700 dark:text-red-300">{avatarError}</p>
      )}
    </div>
  )
}
