import { defineConfig, type PluginOption, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const localEvUi = path.resolve(__dirname, '../ev-ui/dist')
const useLocalEvUi = fs.existsSync(localEvUi)

// PostHog source-map upload. Completely inert unless POSTHOG_API_KEY and
// POSTHOG_PROJECT_ID are set at build time (CI / Render build env) — so local
// dev and current CI are unaffected. See ERROR_TRACKING.md for setup (personal
// API key with error-tracking write scope + the @posthog/cli install-script
// approval). The plugin is imported lazily so it never loads when disabled.
const posthogSourcemapsEnabled = Boolean(
  process.env.POSTHOG_API_KEY && process.env.POSTHOG_PROJECT_ID,
)

export default defineConfig(async (): Promise<UserConfig> => {
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
