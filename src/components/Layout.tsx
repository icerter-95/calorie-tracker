import { NavLink, Outlet } from 'react-router-dom'
import { seedSampleData } from '../db/seed'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
    isActive ? 'text-teal-700' : 'text-stone-500 hover:text-stone-700'
  }`

export default function Layout() {
  async function loadSampleData() {
    if (!window.confirm('Replace all data with sample meals and weight entries?')) return
    await seedSampleData()
    window.location.reload()
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 px-4 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-stone-900">keep it up, Ignasi</h1>
          </div>
          <button
            onClick={loadSampleData}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
          >
            Sample data
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-lg">
          <NavLink to="/" end className={linkClass}>
            <span aria-hidden>📋</span>
            Today
          </NavLink>
          <NavLink to="/history" className={linkClass}>
            <span aria-hidden>📊</span>
            History
          </NavLink>
          <NavLink to="/weight" className={linkClass}>
            <span aria-hidden>⚖️</span>
            Weight
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
