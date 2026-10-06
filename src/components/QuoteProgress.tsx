const MAX_SEGMENTS = 12;

interface QuoteProgressProps {
  /** 1-based position of the quote on screen (ignored when done). */
  current: number;
  total: number;
  /** Topic complete — no quote on screen. */
  done: boolean;
}

/** "Quote n of total" + a segmented bar (one segment per quote; a single bar above 12). */
export function QuoteProgress({ current, total, done }: QuoteProgressProps) {
  const shown = done ? total : Math.min(Math.max(current, 1), total);
  const judged = done ? total : shown - 1;
  const label = `Quote ${shown} of ${total}`;
  return (
    <div className="rr-qprogress">
      <span className="rr-qprogress__label">{label}</span>
      <div className="rr-qprogress__track" role="progressbar" aria-label="Quotes in this issue"
        aria-valuemin={0} aria-valuemax={total} aria-valuenow={judged} aria-valuetext={label}>
        {total > MAX_SEGMENTS ? (
          <div className="rr-qprogress__bar">
            <div className="rr-qprogress__fill" style={{ width: `${total ? (judged / total) * 100 : 0}%` }} />
          </div>
        ) : (
          Array.from({ length: total }, (_, i) => (
            <span key={i} className={`rr-qprogress__seg${i < judged ? ' rr-qprogress__seg--done' : ''}${!done && i === judged ? ' rr-qprogress__seg--current' : ''}`} />
          ))
        )}
      </div>
    </div>
  );
}
