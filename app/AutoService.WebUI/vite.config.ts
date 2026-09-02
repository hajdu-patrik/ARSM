/**
 * vite.config.ts
 *
 * Auto-generated documentation header for this source file.
 */

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

/** Vendor chunk name mapped to the npm packages bundled into it. */
const vendorChunks: Record<string, readonly string[]> = {
  'vendor-react': ['react', 'react-dom', 'react-router', 'react-router-dom'],
  'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
  'vendor-ui': ['lucide-react', 'zustand', 'axios'],
}

/**
 * Resolves the npm package name that owns a bundled module id.
 * @param id Absolute module id produced by the bundler.
 * @returns The package name, or `undefined` when the module is not from `node_modules`.
 */
function resolvePackageName(id: string): string | undefined {
  const normalized = id.replace(/\\/g, '/')
  const marker = '/node_modules/'
  const lastIndex = normalized.lastIndexOf(marker)

  if (lastIndex === -1) {
    return undefined
  }

  const segments = normalized.slice(lastIndex + marker.length).split('/')

  return segments[0]?.startsWith('@') ? `${segments[0]}/${segments[1]}` : segments[0]
}

/**
 * Assigns vendor modules to fixed chunks. Rolldown (Vite 7+) only accepts the
 * function form of `manualChunks`, so the previous object map is resolved here.
 * @param id Absolute module id produced by the bundler.
 * @returns The target chunk name, or `undefined` to use default chunking.
 */
function manualChunks(id: string): string | undefined {
  const packageName = resolvePackageName(id)

  if (!packageName) {
    return undefined
  }

  return Object.keys(vendorChunks).find((chunk) => vendorChunks[chunk].includes(packageName))
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const config = {
    plugins: [react(), mkcert()],
    build: {
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
  }

  if (command !== 'serve') {
    return config
  }

  const parsedPort = Number(env.PORT)
  const devHost = env.VITE_DEV_HOST?.trim() || 'localhost'

  if (!env.PORT || Number.isNaN(parsedPort)) {
    throw new Error('Missing or invalid PORT in environment configuration.')
  }

  return {
    ...config,
    server: {
      https: {},
      host: devHost,
      port: parsedPort,
      strictPort: true,
    },
  }
})
