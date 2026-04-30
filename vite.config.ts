import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy para mitigar CORS durante desenvolvimento
    // Configure conforme necessário para suas APIs
    // proxy: {
    //   '/api': { target: 'http://localhost:3000', changeOrigin: true }
    // }
  },
})
