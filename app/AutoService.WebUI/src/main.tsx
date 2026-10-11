/** WebUI entry point: bootstraps the React application, global styles, and i18n,
 * then mounts the root App component in StrictMode. */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { i18nReady } from './utils/i18n.ts'
import App from './App.tsx'
import { QueryCacheProvider } from './services/cache/QueryCacheProvider.tsx'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Missing #root element in index.html.')
}

await i18nReady

createRoot(rootElement).render(
  <StrictMode>
    <QueryCacheProvider>
      <App />
    </QueryCacheProvider>
  </StrictMode>,
)
