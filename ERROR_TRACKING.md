# PostHog error tracking — Empowered Vote apps

Canonical ops reference for exception/error tracking across the six EV web apps.
Runtime error tracking is done, verified, and now lives in the shared
`@empoweredvote/analytics` package. The **action items you own** are in **bold**
(PostHog dashboard backstops + the personal API key for source maps).

Apps: `ev-landing`, `essentials`, `CompassV2`, `read-rank`,
`Civic-Trivia-Championships/frontend`, `treasury-tracker`.

---

## 1. What's enabled (runtime — done)

The five React/Vite apps init analytics through **`@empoweredvote/analytics`**:

```js
import { init, getClient } from '@empoweredvote/analytics';
import { AppErrorBoundary } from '@empoweredvote/analytics/react';

init({ app: 'treasury', key: import.meta.env.VITE_POSTHOG_KEY /* + per-app opts */ });
// <PostHogProvider client={getClient()}><AppErrorBoundary>…</AppErrorBoundary></PostHogProvider>
```

The package turns on, by default for every app:

- **`capture_exceptions: true`** — exception autocapture, which catches unhandled
  `window.onerror` errors **and** unhandled promise rejections. No separate
  global handler is needed.
- A **`before_send` noise filter + 5s de-dup** (see §3), with an optional
  per-app `beforeSend` hook that runs after it.
- **`AppErrorBoundary`** (from the `/react` subpath) reports **render-time**
  errors — which autocapture does not see — via `captureException`, showing a
  static fallback (no auto-retry loop).
- Auto-stamps every event with `app` + `environment` and sets
  `cross_subdomain_cookie` for cross-app identity. Session replay is **off by
  default** (opt in per app via `sessionRecording`).

`ev-landing` is static HTML (no bundler), so it can't import the package — the
same `capture_exceptions` + noise filter are **inlined** in its
`posthog.init(...)` block in `index.html`.

> **Env-gating / operational note:** the package is a **no-op unless `key` is
> set**. Apps that previously hardcoded the public key (CompassV2, trivia,
> treasury) now read `import.meta.env.VITE_POSTHOG_KEY` — so **`VITE_POSTHOG_KEY`
> must be set in each app's Render env**, or analytics silently sends nothing.

---

## 2. Cost controls — don't let a bad loop spike the bill

| Layer | Where | Status |
|-------|-------|--------|
| ErrorBoundary shows a static fallback (no auto-retry) | package | ✅ done |
| Per-client burst protection (token bucket, default size 10 / refill 1) | posthog-js built-in | ✅ on |
| `before_send` drops known-junk + de-dups identical exceptions (5s window) | package | ✅ done |
| **Server-side rate limit (project-wide + per-issue)** | PostHog UI | ⛔ **you must set** |
| **Billing limit / spend cap on Error Tracking** | PostHog UI | ⛔ **you must set** |

**Action items in PostHog (project 444996):**

1. **Settings → Error tracking → Rate limiting** — set a project-wide cap and a
   per-issue cap. Dropped exceptions are never ingested and never billed.
2. **Organization → Billing** — set a spend cap on Error Tracking.

> The June GCP lesson: an *alert* only emails you; a *hard limit* caps spend. Set
> the **billing limit**, not just an alert.

To tune client-side burst protection (rarely needed), pass `error_tracking:
{ __exceptionRateLimiterBucketSize, __exceptionRateLimiterRefillRate }` through
the package `init`.

---

## 3. Noise filter (what `before_send` drops)

Only `$exception` events are inspected; all other events pass through untouched.
Dropped: `ResizeObserver loop …`, `Script error.`,
`Non-Error promise rejection captured`, network/abort noise (`Failed to fetch`,
`NetworkError…`, `Load failed`, `AbortError`, `The operation was aborted`,
`The user aborted a request`), `*-extension://` errors, and any **duplicate**
(same type+message) seen again within 5 seconds.

---

## 4. Source maps — wired, inert until you provision the key

All 5 Vite apps have the `@posthog/rollup-plugin` wired into `vite.config.*`,
**guarded** so it's completely inert (no upload, no bundle change) unless the
build env has both `POSTHOG_API_KEY` and `POSTHOG_PROJECT_ID`. Verified: inert
builds succeed and emit no `.map` files.

### Env vars the build expects (per app, at build/CI time only)

| Var | Value | Notes |
|-----|-------|-------|
| `POSTHOG_API_KEY` | a **personal** API key (`phx_…`) with **error-tracking write** scope | **NOT** the public `phc_…` client key. Never commit. |
| `POSTHOG_PROJECT_ID` | `444996` (passed as a string) | |
| `POSTHOG_HOST` | `https://us.i.posthog.com` | optional; default |

Store these as **Render build-time env vars / CI secrets**, or a local
**`.env.local`** (gitignored in all six repos — verified). **Never** put the
personal key in `.env.production` (that file is committed). Each app uploads
under its own `releaseName` (`read-rank`, `essentials`, `compass`,
`civic-trivia`, `treasury-tracker`) since all six share one PostHog project.

### To activate (per repo)

1. Set `POSTHOG_API_KEY` + `POSTHOG_PROJECT_ID` in the Render build env.
2. **Approve the blocked install script** — `@posthog/rollup-plugin` pulls
   `@posthog/cli`, whose postinstall downloads the upload binary, and these repos
   block install scripts by policy:
   ```bash
   npm approve-scripts @posthog/cli
   ```
3. Deploy. `npm run build` then injects chunk IDs, uploads maps (`hidden`
   sourcemaps), and deletes them after upload.

---

## 5. Verifying

Verified in treasury-tracker dev (2026-07-20) through the package: `isEnabled`,
`capture_exceptions: true`, `before_send` present, `app`/`environment`
auto-stamped, and `before_send` kept a real error while dropping `ResizeObserver`
noise + a duplicate. Read-rank was separately confirmed to send a `$exception`
to `/i/v0/e/` on a thrown error. All 5 apps build clean with source maps inert.
Confirm live events in PostHog via **Activity → event = `$exception`** (project
444996) or HogQL.
