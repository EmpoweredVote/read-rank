import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PostHogProvider } from 'posthog-js/react'
import posthog from 'posthog-js'
import { initAnalytics } from './lib/analytics'
import './index.css'
import App from './App.tsx'

initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <App />
    </PostHogProvider>
  </StrictMode>,
)
