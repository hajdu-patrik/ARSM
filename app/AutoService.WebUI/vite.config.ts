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

/**
 * Builds a module-id matcher for a set of npm packages (Windows and POSIX separators).
 * @param packages Package names whose modules belong to the group.
 * @returns A RegExp matching any module under one of those packages in `node_modules`.
 */
function packageTest(packages: readonly string[]): RegExp {
  const names = packages.map((name) => name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|')
  return new RegExp(`[\\\\/]node_modules[\\\\/](?:${names})[\\\\/]`)
}

/**
 * Rolldown code-splitting groups for the vendor chunks. Explicit priorities keep every
 * shared dependency (React pulled in through react-i18next) in the React chunk.
 */
const codeSplitting = {
  groups: vendorChunks.map(([name, packages], index) => ({
    name,
    test: packageTest(packages),
    priority: vendorChunks.length - index,
  })),
}

/**
 * Rolldown places its CommonJS interop helpers in a shared app chunk that itself imports
 * the vendor chunks. Without strict execution order the vendor chunks call a helper that
 * is not initialised yet, and the built app crashes at start-up with "t is not a function"
 * (a blank page; broken since the Vite 8 upgrade). Strict order runs module bodies in
 * source order across chunks, at the cost of a few hundred bytes of init wrappers.
 */
const strictExecutionOrder = true

/** Matches inline `<script>` elements (no `src` attribute) in built HTML markup. */
const INLINE_SCRIPT_PATTERN = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi

/**
 * Computes the CSP `sha256-<base64>` source expression for an inline script body.
 * @param scriptContent Raw text content between an inline script's tags.
 * @returns A CSP hash source expression allowing that exact script content.
 */
function toScriptHashSource(scriptContent: string): string {
  const digest = createHash('sha256').update(scriptContent, 'utf8').digest('base64')
  return `'sha256-${digest}'`
}

/**
 * Builds the Content-Security-Policy directive string for the built app.
 * Any inline `<script>` found in the built HTML is allow-listed by hash instead of
 * relying on `'unsafe-inline'`, so an unexpected future inline script still needs an
 * explicit hash to run.
 * @param apiOrigin Origin of the configured API (from `VITE_API_URL`), added to `connect-src`.
 * @param html Final built `index.html` markup, scanned for inline scripts to hash.
 * @returns The CSP value to place in the `Content-Security-Policy` meta tag.
 */
function buildContentSecurityPolicy(apiOrigin: string, html: string): string {
  const inlineScriptHashes = [...html.matchAll(INLINE_SCRIPT_PATTERN)]
    .map(([, scriptContent]) => scriptContent)
    .filter((scriptContent) => scriptContent.trim().length > 0)
    .map(toScriptHashSource)

  const directives: Record<string, string> = {
    'default-src': "'self'",
    'script-src': ["'self'", ...inlineScriptHashes].join(' '),
    // No inline <style> element or style attribute remains (LoadingPage's keyframes and
    // styles live in src/styles/loadingPageAnimations.css; MechanicListSection writes its
    // dynamic max-height through the CSSOM), so style-src covers elements and attributes alike.
    'style-src': "'self'",
    'font-src': "'self'",
    // blob: covers the quote PDF download and the error-illustration cache; data:
    // covers the profile-picture crop preview (FileReader data URL source). The API
    // origin covers profile pictures, which <img> elements load straight from
    // /api/profile/picture on the API host (profile.service.ts).
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

/**
 * Vite plugin injecting a strict Content-Security-Policy `<meta>` tag into the BUILT
 * `index.html` only (`apply: 'build'`), so the dev server's HMR websocket and the
 * React Refresh inline preamble keep working unchanged under `npm run dev`/AppHost.
 * @param apiOrigin Origin of the configured API (from `VITE_API_URL`), added to `connect-src`.
 * @returns The Vite plugin instance.
 */
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

/**
 * Resolves the API origin used in the built app's Content-Security-Policy `connect-src`.
 * Config-first: fails fast instead of falling back to a hardcoded host.
 * @param apiUrl Raw `VITE_API_URL` value read via {@link loadEnv}.
 * @returns The origin (scheme + host + port) of the configured API URL.
 */
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
