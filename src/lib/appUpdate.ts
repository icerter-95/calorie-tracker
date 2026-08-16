/**
 * iOS home-screen apps restore a frozen snapshot and keep a cached index.html,
 * so GitHub Pages deploys never appear until the icon is deleted. Compare this
 * page's hashed JS against a no-cache fetch of index.html; if they differ,
 * replace the URL so WebKit actually loads the new build.
 */
const SCRIPT_SRC_RE = /src="([^"]*\/assets\/index-[^"]+\.js)"/
const RELOAD_GUARD_KEY = 'calorie-tracker.reload-to'

function currentScriptSrc(): string | null {
  return (
    document
      .querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]')
      ?.getAttribute('src') ?? null
  )
}

function scriptSrcFromHtml(html: string): string | null {
  return html.match(SCRIPT_SRC_RE)?.[1] ?? null
}

function buildIdFromSrc(src: string): string {
  const match = src.match(/index-([^/]+)\.js$/)
  return match?.[1] ?? src
}

function hardReload(src: string) {
  const id = buildIdFromSrc(src)
  if (localStorage.getItem(RELOAD_GUARD_KEY) === id) return
  localStorage.setItem(RELOAD_GUARD_KEY, id)

  const url = new URL(window.location.href)
  url.searchParams.set('_v', id)
  window.location.replace(url.toString())
}

async function checkForAppUpdate() {
  const current = currentScriptSrc()
  if (!current) return

  try {
    const res = await fetch(`${import.meta.env.BASE_URL}index.html?_=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
    if (!res.ok) return

    const latest = scriptSrcFromHtml(await res.text())
    if (!latest || latest === current) {
      localStorage.removeItem(RELOAD_GUARD_KEY)
      return
    }

    hardReload(latest)
  } catch {
    // Offline or a Pages blip — keep the build that is already running.
  }
}

/** Start checking on boot and whenever the home-screen app comes back to the foreground. */
export function watchAppUpdates() {
  if (import.meta.env.DEV) return

  void checkForAppUpdate()

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForAppUpdate()
  })
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) void checkForAppUpdate()
  })
  window.addEventListener('focus', () => {
    void checkForAppUpdate()
  })
}
