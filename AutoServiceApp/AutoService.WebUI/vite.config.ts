import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const config = {
    plugins: [react()],
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
