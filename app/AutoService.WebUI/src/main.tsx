/**
 * WebUI entry point.
 *
 * Bootstraps the React application, global styles, and i18n,
 * then mounts the root App component in StrictMode.
 * @module main
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './utils/i18n.ts'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
