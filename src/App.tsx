import { Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import Layout from './components/Layout'
import HistoryPage from './pages/History'
import InsightsPage from './pages/Insights'
import LoginPage from './pages/Login'
import TodayPage from './pages/Today'
import UserPage from './pages/User'
import WeightPage from './pages/Weight'

export default function App() {
  const { configured, loading, session } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 text-sm text-stone-500 dark:bg-stone-950 dark:text-stone-400">
        Loading…
      </div>
    )
  }

  if (!configured || !session) {
    return <LoginPage />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TodayPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="weight" element={<WeightPage />} />
        <Route path="user" element={<UserPage />} />
      </Route>
    </Routes>
  )
}
