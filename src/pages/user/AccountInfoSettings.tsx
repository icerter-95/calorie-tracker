/**
 * Account info settings. Change profile photo, username (also used to sign in),
 * and password / passcode.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import UserAvatar from '../../components/UserAvatar'
import ActionBar from '../../components/ui/ActionBar'
import Button from '../../components/ui/Button'
import Field, { fieldInputClass } from '../../components/ui/Field'
import Sheet from '../../components/ui/Sheet'
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
  const usernameFormId = useId()
  const passwordFormId = useId()

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

  function openEditorSheet(editor: Exclude<Editor, null>) {
    setUsernameError(null)
    setPasswordError(null)
    setUsernameDraft(loginUsername ?? displayName)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setOpenEditor(editor)
  }

  // Photo, username, and password save handlers.
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
    'flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-content hover:bg-hover disabled:opacity-60'
  return (
    <div className="space-y-4">
      {/* Header: avatar + display name + email */}
      <section className="rounded-2xl bg-raised shadow-sm ring-1 ring-line">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="relative shrink-0">
            <button
              type="button"
              disabled={avatarBusy}
              onClick={() => avatarInputRef.current?.click()}
              aria-label={avatarUrl ? 'Change profile photo' : 'Add profile photo'}
              className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
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
            <h2 className="truncate text-base font-semibold text-content">
              {displayName}
              {(usernameSaved || passwordSaved) && (
                <span className="ml-2 text-xs font-medium text-accent-ink">
                  {passwordSaved ? 'Password updated' : 'Saved'}
                </span>
              )}
            </h2>
            <p className="truncate text-xs text-content-subtle">
              {user?.email}
              {user?.email_confirmed_at ? ' · Verified' : ''}
            </p>
          </div>
        </div>
      </section>

      {/* Rows open a composer sheet; nothing edits in place. */}
      <section className="overflow-hidden rounded-2xl bg-raised shadow-sm ring-1 ring-line">
        <button
          type="button"
          disabled={usernameBusy}
          onClick={() => openEditorSheet('username')}
          className={rowClass}
        >
          {loginUsername ? 'Edit username' : 'Set username'}
          <span aria-hidden className="text-content-faint">
            ›
          </span>
        </button>

        <div className="border-t border-divider" />
        <button
          type="button"
          disabled={passwordBusy}
          onClick={() => openEditorSheet('password')}
          className={rowClass}
        >
          Change password
          <span aria-hidden className="text-content-faint">
            ›
          </span>
        </button>
      </section>

      {avatarError && <p className="text-sm text-danger-strong">{avatarError}</p>}

      {openEditor === 'username' && (
        <Sheet
          ariaLabel="Edit username"
          title={loginUsername ? 'Edit username' : 'Set username'}
          onClose={closeEditor}
          closeDisabled={usernameBusy}
          footer={
            <ActionBar
              destructive={
                loginUsername ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={usernameBusy}
                    onClick={() => void handleUsernameRemove()}
                  >
                    Remove
                  </Button>
                ) : undefined
              }
              primary={
                <Button
                  type="submit"
                  form={usernameFormId}
                  disabled={usernameBusy}
                  busy={usernameBusy}
                  busyLabel="Saving…"
                >
                  Save
                </Button>
              }
            />
          }
        >
          <form
            id={usernameFormId}
            onSubmit={(e) => {
              e.preventDefault()
              void handleUsernameSave()
            }}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <div className="space-y-3 p-4">
              <Field
                label="Username"
                hint="This is your name in the app and how you sign in (instead of email)."
              >
                <input
                  type="text"
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={usernameDraft}
                  onChange={(e) => setUsernameDraft(e.target.value)}
                  placeholder="e.g. ignasi"
                  className={fieldInputClass}
                />
              </Field>
              {usernameError && (
                <p className="text-sm text-danger">{usernameError}</p>
              )}
            </div>
          </form>
        </Sheet>
      )}

      {openEditor === 'password' && (
        <Sheet
          ariaLabel="Change password"
          title="Change password"
          onClose={closeEditor}
          closeDisabled={passwordBusy}
          footer={
            <ActionBar
              primary={
                <Button
                  type="submit"
                  form={passwordFormId}
                  disabled={passwordBusy || !currentPassword || !newPassword}
                  busy={passwordBusy}
                  busyLabel="Updating…"
                >
                  Update
                </Button>
              }
            />
          }
        >
          <form
            id={passwordFormId}
            onSubmit={(e) => {
              e.preventDefault()
              void handlePasswordSave()
            }}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <div className="space-y-3 p-4">
              <p className="text-xs text-content-subtle">
                Used for email login and username passcode (min. 6 characters).
              </p>
              <Field label="Current password">
                <input
                  type="password"
                  autoFocus
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={fieldInputClass}
                />
              </Field>
              <Field label="New password / passcode">
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={fieldInputClass}
                />
              </Field>
              <Field label="Confirm new password">
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={fieldInputClass}
                />
              </Field>
              {passwordError && (
                <p className="text-sm text-danger">{passwordError}</p>
              )}
            </div>
          </form>
        </Sheet>
      )}
    </div>
  )
}
