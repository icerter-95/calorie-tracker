import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { getDisplayName } from '../lib/userProfile'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
    isActive
      ? 'text-teal-700 dark:text-teal-400'
      : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
  }`

export default function Layout() {
  const { user } = useAuth()
  const name = getDisplayName(user)

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 px-4 py-4 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
        <div className="flex items-center justify-between gap-3">
          <h1 className="truncate text-lg font-semibold text-stone-900 dark:text-stone-50">
            keep it up, {name}
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
        <div className="mx-auto flex max-w-lg">
          <NavLink to="/" end className={linkClass}>
            <span aria-hidden>📋</span>
            Diary
          </NavLink>
          <NavLink to="/history" className={linkClass}>
            <span aria-hidden>📊</span>
            History
          </NavLink>
          <NavLink to="/insights" className={linkClass}>
            <span aria-hidden>✨</span>
            Insights
          </NavLink>
          <NavLink to="/weight" className={linkClass}>
            <span aria-hidden>⚖️</span>
            Weight
          </NavLink>
          <NavLink to="/user" className={linkClass}>
            <span aria-hidden>👤</span>
            User
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
