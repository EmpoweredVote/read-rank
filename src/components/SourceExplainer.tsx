import React, { useEffect, useRef, useState } from 'react';

const SOURCE_TIERS = [
  'Video-clipped debate excerpts',
  'Verbatim debate transcripts',
  'Official candidate statements',
  'Verified news reporting',
];

const labelStyle: React.CSSProperties = {
  fontFamily: "'Manrope', sans-serif",
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
};

const SourceExplainerDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby="source-explainer-title"
      style={{
        maxWidth: '26rem',
        border: '1px solid var(--border-subtle)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        fontFamily: "'Manrope', sans-serif",
        color: 'var(--text-ink)',
      }}
    >
      <h2
        id="source-explainer-title"
        style={{ fontWeight: 800, fontSize: '1.125rem', margin: '0 0 0.75rem', color: 'var(--text-heading)' }}
      >
        How we source quotes
      </h2>
      <p style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
        Every quote is a real, on-the-record statement.&nbsp; We pull from four kinds of sources, in
        order of preference:
      </p>
      <ol style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 0.75rem', paddingLeft: '1.25rem' }}>
        {SOURCE_TIERS.map((tier) => (
          <li key={tier}>{tier}</li>
        ))}
      </ol>
      <p style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
        While you evaluate, we hide each quote's source on purpose.&nbsp; An outlet or venue can hint
        at who is speaking.&nbsp; When you reveal your ballot, every quote shows its full citation
        with a link so you can verify it yourself.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onClose} className="ev-button-primary" style={{ fontSize: '0.875rem' }}>
          Close
        </button>
      </div>
    </dialog>
  );
};

export interface SourceInfoButtonProps {
  /** Render the label text beside the icon (used in the reveal header). */
  showLabel?: boolean;
}

/** ⓘ trigger for the "How we source quotes" explainer. 44px minimum target. */
export const SourceInfoButton: React.FC<SourceInfoButtonProps> = ({ showLabel = false }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.375rem',
          minWidth: showLabel ? undefined : '2.75rem',
          minHeight: '2.75rem',
          padding: showLabel ? '0.5rem 0.25rem' : 0,
          color: 'var(--text-tertiary)',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        {showLabel ? (
          <span style={labelStyle}>How we source quotes</span>
        ) : (
          <span className="sr-only">How we source quotes</span>
        )}
      </button>
      {open && <SourceExplainerDialog onClose={() => setOpen(false)} />}
    </>
  );
};
