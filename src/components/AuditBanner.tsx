import { useState } from 'react';
import { isContentLockdownActive } from '../config/liveContent';

// Bump the version suffix to re-show the banner to everyone (e.g. if the message
// changes materially) — dismissal is keyed to this string.
const DISMISS_KEY = 'rr-audit-banner-dismissed:v1';

function readDismissed(): boolean {
  try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}

/**
 * Maintenance-style notice explaining why only one race is live. Shows only while
 * a content lockdown is active (src/config/liveContent.ts) and until the user
 * dismisses it; dismissal persists in localStorage.
 */
export function AuditBanner() {
  const [dismissed, setDismissed] = useState(readDismissed);

  if (!isContentLockdownActive() || dismissed) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* private mode — hide for this session only */ }
    setDismissed(true);
  };

  return (
    <div className="rr-audit-banner" role="status">
      <div className="rr-audit-banner-inner">
        <p className="rr-audit-banner-text">
          <span className="rr-audit-banner-label">Heads up</span>
          We&apos;re auditing our candidate quotes to make sure everything&apos;s accurate and
          complete. While we do, only the <strong>California Governor</strong> race is available —
          more will be back soon.
        </p>
        <button
          type="button"
          className="rr-audit-banner-close"
          onClick={dismiss}
          aria-label="Dismiss this message"
          title="Dismiss"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
