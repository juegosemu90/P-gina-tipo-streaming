import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/P-gina-tipo-streaming/', // ← nombre de tu repo
})
