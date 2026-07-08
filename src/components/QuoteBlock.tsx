import React, { useState } from 'react';
import type { RevealQuote } from '../data/api';
import type { AlignmentMark } from '../utils/alignmentMarks';
import { AlignmentMarkView } from './AlignmentMark';
import { EditorNotePopover } from './EditorNotePopover';

export interface QuoteBlockProps {
  topicTitle: string;
  quote: RevealQuote;
  mark: AlignmentMark;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Render verbatim text with the edited span (a substring) in bold. Falls back to
 *  plain verbatim if the edited text isn't found inside it. */
function renderVerbatim(verbatim: string, edited: string): React.ReactNode {
  const idx = edited ? verbatim.indexOf(edited) : -1;
  if (idx === -1) return verbatim;
  return (
    <>
      {verbatim.slice(0, idx)}
      <b>{verbatim.slice(idx, idx + edited.length)}</b>
      {verbatim.slice(idx + edited.length)}
    </>
  );
}

/** One topic's quote: edited by default, expandable to verbatim (bold span) +
 *  editor's note; source + date shown in both states (spec §5). */
export const QuoteBlock: React.FC<QuoteBlockProps> = ({ topicTitle, quote, mark }) => {
  const [raw, setRaw] = useState(false);
  const hasVerbatim = !!quote.verbatimText && quote.verbatimText !== quote.text;
  const disagreed = mark?.kind === 'disagreed';

  const videoHref = quote.videoUrl && quote.videoTimestampSeconds != null
    ? `${quote.videoUrl}?t=${quote.videoTimestampSeconds}`
    : null;

  return (
    <div className="quote-block">
      <div className="quote-block-head">
        <AlignmentMarkView mark={mark} size={17} />
        <p className="quote-block-topic">{topicTitle}</p>
      </div>

      {raw && hasVerbatim ? (
        <p className={`quote-verbatim ${disagreed ? 'is-dis' : ''}`}>
          &ldquo;{renderVerbatim(quote.verbatimText!, quote.text)}&rdquo;
        </p>
      ) : (
        <p className={`quote-edited ${disagreed ? 'is-dis' : ''}`}>&ldquo;{quote.text}&rdquo;</p>
      )}

      <p className="quote-attrib">
        {quote.sourceName && <span className="quote-src">{quote.sourceName}</span>}
        {quote.sourceDate && <> · {quote.sourceDate}</>}
        {(quote.sourceUrl || videoHref) && <> · </>}
        {videoHref ? (
          <a className="quote-video" href={videoHref} target="_blank" rel="noopener noreferrer">
            ▶ Watch at {formatTimestamp(quote.videoTimestampSeconds!)}
          </a>
        ) : quote.sourceUrl ? (
          <a className="quote-srclink" href={quote.sourceUrl} target="_blank" rel="noopener noreferrer">View source ↗</a>
        ) : null}
      </p>

      {hasVerbatim && (
        <div className="quote-actions">
          <button type="button" className="quote-toggle" onClick={() => setRaw((r) => !r)}>
            {raw ? 'Show edited version' : 'Show full quote'}
          </button>
          {raw && quote.editorNote && <EditorNotePopover note={quote.editorNote} />}
        </div>
      )}
    </div>
  );
};
