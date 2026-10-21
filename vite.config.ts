import { defineConfig, loadEnv, type PluginOption, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const localEvUi = path.resolve(__dirname, '../ev-ui/dist')
const useLocalEvUi = fs.existsSync(localEvUi)

// Local dev reads the LIVE public API by default, so a fresh clone with no .env
// shows real data. The browser calls same-origin `/api` (src/data/api.ts falls
// back to it when VITE_API_URL is unset) and this proxy forwards it. The live
// API's CORS allow-list excludes localhost, and it rejects a disallowed Origin,
// so the proxy strips the header (same pattern as essentials). Signed out, it
// reaches only what any visitor reaches. Running ev-accounts locally? Set
// VITE_API_PROXY_TARGET=http://localhost:3000. Dev only; builds are unaffected.
const LIVE_API = 'https://accounts-api.empowered.vote'

// PostHog source-map upload. Completely inert unless POSTHOG_API_KEY and
// POSTHOG_PROJECT_ID are set at build time (CI / Render build env) — so local
// dev and current CI are unaffected. See ERROR_TRACKING.md for setup (personal
// API key with error-tracking write scope + the @posthog/cli install-script
// approval). The plugin is imported lazily so it never loads when disabled.
const posthogSourcemapsEnabled = Boolean(
  process.env.POSTHOG_API_KEY && process.env.POSTHOG_PROJECT_ID,
)

export default defineConfig(async ({ mode }): Promise<UserConfig> => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiTarget = env.VITE_API_PROXY_TARGET || LIVE_API
  if (mode === 'development' && env.VITE_API_URL) {
    console.warn(
      `\n[read-rank] VITE_API_URL=${env.VITE_API_URL} skips the /api dev proxy.` +
        ' Unset it to read live data through the proxy.\n',
    )
  }
  const plugins: PluginOption[] = [react()]
  if (posthogSourcemapsEnabled) {
    const { default: posthogSourcemaps } = await import('@posthog/rollup-plugin')
    plugins.push(
      posthogSourcemaps({
        personalApiKey: process.env.POSTHOG_API_KEY!,
        projectId: process.env.POSTHOG_PROJECT_ID,
        host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
        sourcemaps: { enabled: true, releaseName: 'read-rank' },
      }) as PluginOption,
    )
  }

  return {
    plugins,
    base: '/',
    resolve: {
      alias: useLocalEvUi ? { '@empoweredvote/ev-ui': localEvUi } : {},
      dedupe: ['react', 'react-dom', '@react-spring/web'],
    },
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'))
          },
        },
        '/auth': {
          target: 'http://localhost:5050',
          changeOrigin: true,
        },
      },
    },
    // 'hidden' emits maps for upload without leaving a sourceMappingURL comment
    // in shipped bundles; the plugin deletes them after upload by default.
    build: { sourcemap: posthogSourcemapsEnabled ? ('hidden' as const) : false },
  }
})
