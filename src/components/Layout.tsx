/**
 * App chrome: sticky header, pull-to-refresh, tab bar, and nested page outlet.
 * Stack pages (profile, meal detail, weight history) hide the tab bar and
 * show a back button; iOS edge-swipe also goes back.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import type { PullToRefreshOutletContext } from '../hooks/useRegisterPullToRefresh'
import { getAvatarUrl, getDisplayName } from '../lib/userProfile'
import { DiaryIcon, HealthIcon, ProgressIcon } from './NavIcons'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import UserAvatar from './UserAvatar'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 pt-1 pb-1 text-[10px] font-medium leading-tight transition-colors ${
    isActive
      ? 'text-accent-ink'
      : 'text-content-subtle hover:text-content-muted'
  }`

const TAB_TITLES: Record<string, string> = {
  '/': 'Diary',
  '/progress': 'Progress',
  '/history': 'Progress',
  '/health': 'Health',
  '/weight': 'Health',
  '/insights': 'Insights',
}

const USER_SECTION_TITLES: Record<string, string> = {
  '/user': 'Profile',
  '/user/account': 'Account info',
  '/user/appearance': 'Appearance',
  '/user/goals': 'Goals',
  '/user/connections': 'Connections',
  '/user/data': 'Data',
}

const STACK_PAGE_TITLES: Record<string, string> = {
  '/health/weight-history': 'Weight history',
}

const STACK_PAGE_BACK: Record<string, string> = {
  '/health/weight-history': 'Health',
}

type UserLocationState = {
  from?: string
}

export default function Layout() {
  const { user } = useAuth()
  const name = getDisplayName(user)
  const avatarUrl = getAvatarUrl(user)
  const location = useLocation()
  const navigate = useNavigate()
  const shellRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const pullRefreshHandlerRef = useRef<(() => Promise<void>) | null>(null)
  const [pullRefreshEnabled, setPullRefreshEnabled] = useState(false)
  const isUserArea = location.pathname === '/user' || location.pathname.startsWith('/user/')
  const isUserHub = location.pathname === '/user'
  const isUserSubpage = isUserArea && !isUserHub
  const isMealDetail = /^\/meal\/[^/]+$/.test(location.pathname)
  const isFixedStackPage = location.pathname in STACK_PAGE_TITLES
  const isStackPage = isFixedStackPage || isMealDetail
  const hidesTabBar = isUserArea || isStackPage
  const fromPath = (location.state as UserLocationState | null)?.from
  const backLabel = isUserSubpage
    ? 'Profile'
    : isMealDetail
      ? (fromPath && TAB_TITLES[fromPath]) || 'Back'
      : isFixedStackPage
        ? STACK_PAGE_BACK[location.pathname] ?? 'Back'
        : (fromPath && TAB_TITLES[fromPath]) || 'Back'
  const tabTitle = TAB_TITLES[location.pathname] ?? 'Diary'
  const sectionTitle = isMealDetail
    ? 'Meal'
    : isFixedStackPage
      ? STACK_PAGE_TITLES[location.pathname]
      : (USER_SECTION_TITLES[location.pathname] ?? 'Profile')

  const setPullToRefresh = useCallback((handler: (() => Promise<void>) | null) => {
    pullRefreshHandlerRef.current = handler
    setPullRefreshEnabled(handler != null)
  }, [])

  const handlePullRefresh = useCallback(async () => {
    const handler = pullRefreshHandlerRef.current
    if (handler) await handler()
  }, [])

  const { pullDistance, refreshing, threshold } = usePullToRefresh({
    onRefresh: handlePullRefresh,
    enabled: pullRefreshEnabled,
    contentRef: mainRef,
  })

  const outletContext: PullToRefreshOutletContext = { setPullToRefresh }

  function openUser() {
    navigate('/user', { state: { from: location.pathname } })
  }

  // Prefer browser history; fall back to a sensible parent route.
  const goBack = useCallback(() => {
    // Prefer real history so iOS edge-swipe / browser back match the ← button
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    if (isUserSubpage) {
      navigate('/user', { state: { from: fromPath }, replace: true })
      return
    }
    if (isMealDetail) {
      navigate(fromPath && !fromPath.startsWith('/user') ? fromPath : '/', { replace: true })
      return
    }
    if (isFixedStackPage) {
      navigate('/health', { replace: true })
      return
    }
    if (fromPath && !fromPath.startsWith('/user')) {
      navigate(fromPath, { replace: true })
      return
    }
    navigate('/', { replace: true })
  }, [fromPath, isFixedStackPage, isMealDetail, isUserSubpage, navigate])

  useEdgeSwipeBack(shellRef, {
    enabled: hidesTabBar,
    onBack: goBack,
  })

  // Clear any in-progress swipe transform after a route change
  useEffect(() => {
    const el = shellRef.current
    if (!el) return
    el.style.transition = 'none'
    el.style.transform = ''
  }, [location.pathname])

  useEffect(() => {
    const header = headerRef.current
    if (!header) return

    function publishHeight() {
      const height = headerRef.current?.offsetHeight ?? 0
      document.documentElement.style.setProperty('--app-header-height', `${height}px`)
    }

    publishHeight()
    const observer = new ResizeObserver(publishHeight)
    observer.observe(header)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--app-header-height')
    }
  }, [hidesTabBar, name, sectionTitle, tabTitle])

  return (
    <div
      ref={shellRef}
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-x-hidden bg-surface"
    >
      {/* Sticky top bar: page title + avatar, or back + section title */}
      <header
        ref={headerRef}
        className="sticky top-0 z-20 border-b border-edge bg-chrome/90 px-4 py-1.5 backdrop-blur"
      >
        {hidesTabBar ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              className="-ml-1 flex items-center gap-1 rounded-lg px-1.5 py-1 text-sm font-medium text-accent-ink hover:bg-accent-soft"
            >
              <span aria-hidden className="text-lg leading-none">
                ←
              </span>
              <span>{backLabel}</span>
            </button>
            <h1 className="min-w-0 flex-1 truncate text-right text-base font-semibold text-content">
              {sectionTitle}
            </h1>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <h1 className="min-w-0 truncate text-base font-semibold text-content">
              {tabTitle}
            </h1>
            <button
              type="button"
              onClick={openUser}
              aria-label="Open profile"
              className="shrink-0 rounded-full ring-2 ring-transparent transition hover:ring-accent/40 focus-visible:outline-none focus-visible:ring-accent"
            >
              <UserAvatar name={name} avatarUrl={avatarUrl} size="sm" />
            </button>
          </div>
        )}
      </header>

      <div className="relative flex-1">
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          refreshing={refreshing}
          threshold={threshold}
        />
        <main
          ref={mainRef}
          className={`will-change-transform px-4 py-3 ${hidesTabBar ? 'pb-8' : 'pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]'}`}
        >
          <Outlet context={outletContext} />
        </main>
      </div>

      {!hidesTabBar && (
        <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-edge bg-chrome pb-[env(safe-area-inset-bottom,0px)]">
          {/* Diary / Progress / Health — Insights tab is temporarily hidden */}
          <div className="mx-auto flex max-w-lg items-center">
            <NavLink to="/" end className={linkClass}>
              {({ isActive }) => (
                <>
                  <DiaryIcon active={isActive} />
                  Diary
                </>
              )}
            </NavLink>
            <NavLink to="/progress" className={linkClass}>
              {({ isActive }) => (
                <>
                  <ProgressIcon active={isActive} />
                  Progress
                </>
              )}
            </NavLink>
            {/* Temporarily hidden — route and page kept for later */}
            {false && (
              <NavLink to="/insights" className={linkClass}>
                Insights
              </NavLink>
            )}
            <NavLink to="/health" className={linkClass}>
              {({ isActive }) => (
                <>
                  <HealthIcon active={isActive} />
                  Health
                </>
              )}
            </NavLink>
          </div>
        </nav>
      )}
    </div>
  )
}
