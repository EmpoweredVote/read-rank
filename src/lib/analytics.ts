// Read & Rank analytics facade.
//
// Delegates to the shared @empoweredvote/analytics package. Kept as a thin local
// module so existing call sites (`track`, `identify`, `resetIdentity`) don't
// churn; new code can import from the package directly.
//
// Config comes from Vite env vars (see .env.example):
//   VITE_POSTHOG_KEY   — project key (shared across all Empowered Vote apps)
//   VITE_POSTHOG_HOST  — ingestion host (defaults to US cloud)
//
// When VITE_POSTHOG_KEY is absent (e.g. a local dev shell without it set), the
// package runs in no-op mode: nothing is sent and nothing throws. That is how
// dev/prod traffic gets split — prod sets the key, local can leave it unset.

import {
  init,
  identify as phIdentify,
  reset as phReset,
  isEnabled,
  getClient,
} from '@empoweredvote/analytics';

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

/** True when a key is configured and analytics will actually send. */
export const analyticsEnabled = Boolean(KEY);

export function initAnalytics(): void {
  init({ app: 'readrank', key: KEY, host: HOST });
}

/** Capture a custom event. All Read & Rank events are prefixed `readrank_`. */
export function track(event: string, props?: Record<string, unknown>): void {
  if (!isEnabled()) return;
  getClient().capture(event, props);
}

/** Associate the current session with a signed-in user. */
export function identify(id: string, props?: Record<string, unknown>): void {
  phIdentify(id, props);
}

/** Clear identity on sign-out so a shared device doesn't blend users. */
export function resetIdentity(): void {
  phReset();
}
