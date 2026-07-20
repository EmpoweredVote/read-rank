import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PostHogProvider } from 'posthog-js/react'
import { getClient } from '@empoweredvote/analytics'
import { AppErrorBoundary } from '@empoweredvote/analytics/react'
import { initAnalytics } from './lib/analytics'
import './index.css'
import App from './App.tsx'

initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider client={getClient()}>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </PostHogProvider>
  </StrictMode>,
)
