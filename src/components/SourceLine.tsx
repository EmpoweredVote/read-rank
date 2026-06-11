import React from 'react';

export interface SourceLineProps {
  sourceName?: string;
  sourceUrl?: string;
  /** 'compact' for dense lists (reveal breakdown); 'default' elsewhere. */
  variant?: 'default' | 'compact';
}

/**
 * Post-reveal source attribution. NEVER render this pre-reveal:
 * provenance identifies speakers (REDESIGN_SPEC.md §4).
 */
export const SourceLine: React.FC<SourceLineProps> = ({ sourceName, sourceUrl, variant = 'default' }) => {
  if (!sourceName) return null;

  const fontSize = variant === 'compact' ? '0.6875rem' : '0.875rem';

  if (!sourceUrl) {
    return (
      <span style={{ fontFamily: "'Manrope', sans-serif", fontSize, color: 'var(--text-secondary)' }}>
        {sourceName}
      </span>
    );
  }

  return (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Verify source: ${sourceName} (opens in new tab)`}
      onClick={(e) => e.stopPropagation()}
      className="ev-source-link"
      style={{
        fontFamily: "'Manrope', sans-serif",
        fontSize,
        fontWeight: 600,
        color: 'var(--text-link)',
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        // 44px target for standalone use; inline-in-text (compact) is exempt per WCAG 2.5.8.
        minHeight: variant === 'compact' ? undefined : '2.75rem',
        padding: variant === 'compact' ? '0.125rem 0' : '0.375rem 0',
      }}
    >
      {sourceName}
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
};
