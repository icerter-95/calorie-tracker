import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import Layout from './components/Layout'
import DiaryPage from './pages/Diary'
import HealthPage from './pages/Health'
import HistoryPage from './pages/History'
import InsightsPage from './pages/Insights'
import LoginPage from './pages/Login'
import WeightHistoryPage from './pages/WeightHistory'
import AccountInfoSettings from './pages/user/AccountInfoSettings'
import AppearanceSettings from './pages/user/AppearanceSettings'
import ConnectionsSettings from './pages/user/ConnectionsSettings'
import DataSettings from './pages/user/DataSettings'
import GoalsSettings from './pages/user/GoalsSettings'
import UserHub from './pages/user/UserHub'

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
        <Route index element={<DiaryPage />} />
        <Route path="progress" element={<HistoryPage />} />
        <Route path="history" element={<Navigate to="/progress" replace />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="health" element={<HealthPage />} />
        <Route path="health/weight-history" element={<WeightHistoryPage />} />
        <Route path="weight" element={<Navigate to="/health" replace />} />
        <Route path="user">
          <Route index element={<UserHub />} />
          <Route path="account" element={<AccountInfoSettings />} />
          <Route path="appearance" element={<AppearanceSettings />} />
          <Route path="goals" element={<GoalsSettings />} />
          <Route path="connections" element={<ConnectionsSettings />} />
          <Route path="data" element={<DataSettings />} />
        </Route>
      </Route>
    </Routes>
  )
}
