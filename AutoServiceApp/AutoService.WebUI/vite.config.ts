import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const config = {
    plugins: [react(), mkcert()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
            'vendor-ui': ['lucide-react', 'zustand', 'axios'],
          },
        },
      },
    },
  }

  if (command !== 'serve') {
    return config
  }

  const parsedPort = Number(env.PORT)

  if (!env.PORT || Number.isNaN(parsedPort)) {
    throw new Error('Missing or invalid PORT in environment configuration.')
  }

  return {
    ...config,
    server: {
      port: parsedPort,
      strictPort: true,
    },
  }
})
