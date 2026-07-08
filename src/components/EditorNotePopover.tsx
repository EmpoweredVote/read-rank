import React, { useId, useState } from 'react';

export interface EditorNotePopoverProps {
  note: string;
}

/**
 * Quiet footnote "(i) editor's note". It's a real <button>, so a single toggle
 * handler covers mouse click, touch tap, and keyboard (Enter/Space) — fully
 * accessible without hover. (A hover-open nicety can be layered in CSS later; we
 * deliberately keep state on click only so focus-then-click can't cancel itself.)
 */
export const EditorNotePopover: React.FC<EditorNotePopoverProps> = ({ note }) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="editor-note">
      <button type="button" className="editor-note-trigger"
        aria-expanded={open} aria-controls={id}
        onClick={() => setOpen((o) => !o)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
        </svg>
        editor's note
      </button>
      {open && <span role="note" id={id} className="editor-note-pop">{note}</span>}
    </span>
  );
};
