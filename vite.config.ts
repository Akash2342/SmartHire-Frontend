import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // In development the frontend runs on :5173 and the Spring Boot backend on :8087.
    // Proxying /api/* to the backend avoids CORS issues — the browser sees one origin.
    // In production, the real web server (nginx / cloud gateway) does this instead.
    proxy: {
      '/api': {
        target: 'http://localhost:8087',
        changeOrigin: true,
      },
    },
  },
})
