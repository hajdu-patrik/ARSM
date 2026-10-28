import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { constants as zlibConstants, gzipSync } from 'node:zlib'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import mkcert from 'vite-plugin-mkcert'

/** Vendor chunk name mapped to the npm packages bundled into it, highest priority first. */
const vendorChunks: ReadonlyArray<readonly [name: string, packages: readonly string[]]> = [
  // `scheduler` is react-dom's own runtime dependency, so it belongs with React.
  ['vendor-react', ['react', 'react-dom', 'react-router', 'scheduler']],
  ['vendor-i18n', ['i18next', 'react-i18next']],
  ['vendor-ui', ['lucide-react', 'zustand', 'axios']],
  // Each package is listed by name: the matcher requires a path separator right after it.
  [
    'vendor-query',
    [
      '@tanstack/react-query',
      '@tanstack/query-core',
      '@tanstack/react-query-persist-client',
      '@tanstack/query-persist-client-core',
    ],
  ],
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

/** Computes the CSP `sha256-<base64>` source expression for an inline script body; line endings are
 * normalized to LF first, as the browser does, so a CRLF checkout (Windows) still matches. */
function toScriptHashSource(scriptContent: string): string {
  const digest = createHash('sha256').update(scriptContent.replace(/\r\n?/g, '\n'), 'utf8').digest('base64')
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
    // blob: PDF download and illustration cache; data: crop preview; API origin: profile pictures.
    'img-src': `'self' data: blob: ${apiOrigin}`,
    'connect-src': `'self' ${apiOrigin}`,
    'object-src': "'none'",
    // The app never writes a <base> element, so no base URI is allowed (ASVS 3.4.3).
    'base-uri': "'none'",
    'form-action': "'self'",
    'manifest-src': "'self'",
    // Valueless directive: http: subresource requests are upgraded to https:.
    'upgrade-insecure-requests': '',
    // Trusted Types: no policy may be created, so every DOM injection sink rejects plain strings.
    'require-trusted-types-for': "'script'",
    'trusted-types': "'none'",
  }

  return Object.entries(directives)
    .map(([directive, value]) => `${directive} ${value}`.trim())
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

/** Per-chunk gzip budget in bytes (1 kB = 1000 bytes, like Vite's report): the largest chunk
 * today (vendor-react) rounded up to the next 10 kB. Exceeding it only warns. */
const CHUNK_GZIP_BUDGET_BYTES = 90_000

/** Text asset extensions that get a precompressed `.gz` sibling; images are already compressed. */
const PRECOMPRESS_EXTENSIONS: ReadonlySet<string> = new Set([
  '.js',
  '.css',
  '.html',
  '.svg',
  '.json',
  '.webmanifest',
  '.txt',
  '.xml',
])

/** Smaller files are served uncompressed, the same floor as nginx `gzip_min_length`. */
const PRECOMPRESS_MIN_BYTES = 1024

/** Gzips at the highest level; the build pays the CPU once and nginx `gzip_static` serves the result. */
function gzipMax(source: string | Buffer): Buffer {
  return gzipSync(source, { level: zlibConstants.Z_BEST_COMPRESSION })
}

/** Formats a byte count as kB with one decimal (1 kB = 1000 bytes). */
function formatKilobytes(bytes: number): string {
  return `${(bytes / 1000).toFixed(1)} kB`
}

/** Build-only bundle budget: warns, never fails the build, when a JS chunk's gzip size exceeds
 * `CHUNK_GZIP_BUDGET_BYTES`. */
function bundleBudgetPlugin(): Plugin {
  return {
    name: 'arsm-bundle-budget',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') {
          continue
        }

        const gzipBytes = gzipMax(output.code).length
        if (gzipBytes > CHUNK_GZIP_BUDGET_BYTES) {
          this.warn(
            `Chunk ${output.fileName} is ${formatKilobytes(gzipBytes)} gzip, over the ` +
              `${formatKilobytes(CHUNK_GZIP_BUDGET_BYTES)} per-chunk budget (CHUNK_GZIP_BUDGET_BYTES in vite.config.ts).`,
          )
        }
      }
    },
  }
}

/** Build-only precompression: writes a level-9 `.gz` sibling for every emitted text asset, which
 * nginx serves through `gzip_static`. No brotli: the nginx image has no ngx_brotli module. */
function precompressPlugin(): Plugin {
  return {
    name: 'arsm-precompress',
    apply: 'build',
    writeBundle(options) {
      if (options.dir === undefined) {
        return
      }

      const outDir = resolve(options.dir)
      for (const relativePath of readdirSync(outDir, { recursive: true, encoding: 'utf8' })) {
        if (!PRECOMPRESS_EXTENSIONS.has(extname(relativePath).toLowerCase())) {
          continue
        }

        const file = resolve(outDir, relativePath)
        const source = readFileSync(file)
        if (source.length < PRECOMPRESS_MIN_BYTES) {
          continue
        }

        const compressed = gzipMax(source)
        if (compressed.length < source.length) {
          writeFileSync(`${file}.gz`, compressed)
        }
      }
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

/** Fails a build without VITE_SITE_URL, because Vite would ship the literal %VITE_SITE_URL% in the
 * og:image and twitter:image tags of index.html. */
function requireSiteUrl(siteUrl: string | undefined): void {
  if (!siteUrl) {
    throw new Error('Missing VITE_SITE_URL in environment configuration.')
  }
}

/** Shared config; builds add the CSP, bundle-budget and precompress plugins, the dev server needs PORT. */
export default defineConfig(({ mode, command }) => {
  const env: Record<string, string | undefined> = loadEnv(mode, process.cwd(), '')
  const config = {
    plugins: [react(), babel({ presets: [reactCompilerPreset()] }), mkcert()],
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
    requireSiteUrl(env.VITE_SITE_URL)
    return {
      ...config,
      plugins: [
        ...config.plugins,
        contentSecurityPolicyPlugin(resolveApiOrigin(env.VITE_API_URL)),
        bundleBudgetPlugin(),
        precompressPlugin(),
      ],
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
