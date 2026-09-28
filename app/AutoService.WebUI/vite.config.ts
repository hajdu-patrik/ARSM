import { createHash } from 'node:crypto'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

/** Vendor chunk name mapped to the npm packages bundled into it, highest priority first. */
const vendorChunks: ReadonlyArray<readonly [name: string, packages: readonly string[]]> = [
  // `scheduler` is react-dom's own runtime dependency, so it belongs with React.
  ['vendor-react', ['react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler']],
  ['vendor-i18n', ['i18next', 'react-i18next', 'i18next-browser-languagedetector']],
  ['vendor-ui', ['lucide-react', 'zustand', 'axios']],
]

/** Builds a module-id matcher for a set of npm packages (Windows and POSIX separators). */
function packageTest(packages: readonly string[]): RegExp {
  const names = packages.map((name) => name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|')
  return new RegExp(`[\\\\/]node_modules[\\\\/](?:${names})[\\\\/]`)
}

/** Rolldown code-splitting groups for the vendor chunks; explicit priorities keep shared
 * deps (React via react-i18next) in the React chunk. See app/AutoService.WebUI/CLAUDE.md. */
const codeSplitting = {
  groups: vendorChunks.map(([name, packages], index) => ({
    name,
    test: packageTest(packages),
    priority: vendorChunks.length - index,
  })),
}

/** Without strict execution order, Rolldown's shared CommonJS interop chunk crashes at
 * start-up ("t is not a function"); keep true. See app/AutoService.WebUI/CLAUDE.md. */
const strictExecutionOrder = true

/** Matches inline `<script>` elements (no `src` attribute) in built HTML markup. */
const INLINE_SCRIPT_PATTERN = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi

/** Computes the CSP `sha256-<base64>` source expression for an inline script body. */
function toScriptHashSource(scriptContent: string): string {
  const digest = createHash('sha256').update(scriptContent, 'utf8').digest('base64')
  return `'sha256-${digest}'`
}

/** Builds the CSP directive string for the built app: inline scripts are allow-listed by
 * sha256 hash instead of `'unsafe-inline'`. See app/AutoService.WebUI/CLAUDE.md. */
function buildContentSecurityPolicy(apiOrigin: string, html: string): string {
  const inlineScriptHashes = [...html.matchAll(INLINE_SCRIPT_PATTERN)]
    .map(([, scriptContent]) => scriptContent)
    .filter((scriptContent) => scriptContent.trim().length > 0)
    .map(toScriptHashSource)

  const directives: Record<string, string> = {
    'default-src': "'self'",
    'script-src': ["'self'", ...inlineScriptHashes].join(' '),
    // No inline <style>/style attribute remains (see app/AutoService.WebUI/CLAUDE.md);
    // style-src covers elements and attributes alike.
    'style-src': "'self'",
    'font-src': "'self'",
    // blob: covers PDF download and error-illustration cache; data: covers the crop
    // preview; the API origin covers profile pictures (<img> loads them directly).
    'img-src': `'self' data: blob: ${apiOrigin}`,
    'connect-src': `'self' ${apiOrigin}`,
    'object-src': "'none'",
    'base-uri': "'self'",
    'form-action': "'self'",
  }

  return Object.entries(directives)
    .map(([directive, value]) => `${directive} ${value}`)
    .join('; ')
}

/** Vite plugin injecting a strict CSP `<meta>` tag into the BUILT `index.html` only
 * (`apply: 'build'`), so dev-server HMR and React Refresh keep working. */
function contentSecurityPolicyPlugin(apiOrigin: string): Plugin {
  return {
    name: 'arsm-csp-meta',
    apply: 'build',
    transformIndexHtml: {
      // Runs after Vite's own HTML transforms (asset script/link injection) so any
      // inline script another plugin might add is present in `html` to hash.
      order: 'post',
      handler(html) {
        return [
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              content: buildContentSecurityPolicy(apiOrigin, html),
            },
            injectTo: 'head-prepend',
          },
        ]
      },
    },
  }
}

/** Resolves the API origin for the CSP `connect-src`; config-first, no localhost fallback
 * (see app/AutoService.WebUI/CLAUDE.md). */
function resolveApiOrigin(apiUrl: string | undefined): string {
  if (!apiUrl) {
    throw new Error('Missing VITE_API_URL in environment configuration.')
  }

  return new URL(apiUrl).origin
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const config = {
    plugins: [react(), mkcert()],
    build: {
      rolldownOptions: {
        output: {
          codeSplitting,
          strictExecutionOrder,
        },
      },
    },
  }

  if (command !== 'serve') {
    return {
      ...config,
      plugins: [...config.plugins, contentSecurityPolicyPlugin(resolveApiOrigin(env.VITE_API_URL))],
    }
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
