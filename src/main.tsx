/**
 * App entry point. Mounts React, wraps the tree with auth + settings, and
 * starts the router (base path `/calorie-tracker` for GitHub Pages).
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { SettingsProvider } from './hooks/useSettings'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter basename="/calorie-tracker">
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
