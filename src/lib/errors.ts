/**
 * Normalize thrown values from Supabase / fetch into a user-facing string.
 * PostgREST often returns plain `{ message, code, ... }` objects (not Error).
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err.trim()) return err
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message?: unknown }).message
    if (typeof msg === 'string' && msg.trim()) return msg
  }
  return fallback
}

/** Point existing projects at the favorites migration when the table is missing. */
export function withFavoriteSetupHint(message: string): string {
  if (/favorite_meals|schema cache|relation .* does not exist/i.test(message)) {
    return 'Favorites need a one-time database setup. In Supabase → SQL Editor, run supabase/migrations/004_favorite_meals.sql, then try again.'
  }
  return message
}
