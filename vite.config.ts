import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/calorie-tracker/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    hmr: { overlay: true },
  },
})
