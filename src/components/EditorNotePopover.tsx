import React, { useEffect, useId, useRef, useState } from 'react';

export interface EditorNotePopoverProps {
  note: string;
}

/**
 * Quiet footnote "(i) editor's note". It's a real <button>, so a single toggle
 * handler covers mouse click, touch tap, and keyboard (Enter/Space) — fully
 * accessible without hover. While open it dismisses on Escape or a click/tap
 * outside, so it never gets stranded when the user moves on.
 */
export const EditorNotePopover: React.FC<EditorNotePopoverProps> = ({ note }) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <span className="editor-note" ref={ref}>
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
