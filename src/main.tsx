import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { seedIfEmpty } from './db/seed'
import './index.css'

seedIfEmpty().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter basename="/calorie-tracker">
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
})
