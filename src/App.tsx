import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import HistoryPage from './pages/History'
import TodayPage from './pages/Today'
import WeightPage from './pages/Weight'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TodayPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="weight" element={<WeightPage />} />
      </Route>
    </Routes>
  )
}
