import posthog from 'posthog-js';

// PostHog analytics for Read & Rank.
//
// Config comes from Vite env vars (see .env.example):
//   VITE_POSTHOG_KEY   — project key (shared across all Empowered Vote apps)
//   VITE_POSTHOG_HOST  — ingestion host (defaults to US cloud)
//
// When VITE_POSTHOG_KEY is absent (e.g. a local dev shell without it set),
// every export below is a no-op — nothing is sent and nothing throws. That is
// how dev/prod traffic gets split: prod sets the key, local can leave it unset.

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com';

/** True when a key is configured and analytics will actually send. */
export const analyticsEnabled = Boolean(KEY);

export function initAnalytics(): void {
  if (!KEY) return;
  posthog.init(KEY, {
    api_host: HOST,
    defaults: '2026-01-30',
    person_profiles: 'identified_only',
    // We capture pageviews manually on route changes (SPA), so disable auto.
    capture_pageview: false,
  });
}

/** Capture a custom event. All Read & Rank events are prefixed `readrank_`. */
export function track(event: string, props?: Record<string, unknown>): void {
  if (!KEY) return;
  posthog.capture(event, props);
}

/** Associate the current session with a signed-in user. */
export function identify(id: string, props?: Record<string, unknown>): void {
  if (!KEY || !id) return;
  posthog.identify(id, props);
}

/** Clear identity on sign-out so a shared device doesn't blend users. */
export function resetIdentity(): void {
  if (!KEY) return;
  posthog.reset();
}
