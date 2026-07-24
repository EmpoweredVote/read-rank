// src/components/RankList.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import type { AgreedQuote } from '../store/useReadRankStore';
import { tierAnnouncement } from '../utils/tiers';
import { deriveRanks } from '../utils/deriveRanks';

/** Ordinal labels for the top three podium positions. */
const ORD = ['', '1st', '2nd', '3rd'];

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" />
    </svg>
  );
}

interface RowContentProps {
  quote: AgreedQuote;
  index: number;
  /** Derived (tie-aware, truncation-aware) rank; null means unranked ("also agree"). */
  rank: number | null;
  reorderMode: boolean;
  /** view mode only: open the assign popover for this row's number. */
  onNumberClick?: (e: React.MouseEvent<HTMLButtonElement>, id: string) => void;
  popOpen?: boolean;
  dragHandleProps?: Record<string, unknown>;
  /** view mode only: toggle "tie with the quote above" for this row. */
  onToggleTie?: (id: string) => void;
  /** True when the NEXT row ties up to this one — this row is the top of that
   *  tie group, so it gets the matching top half of the bracket accent. */
  tieAbove?: boolean;
  /** view mode only: truncate the ranked set right after this row (index + 1). */
  onSetRankedCount?: (n: number) => void;
}

/** Muted, empty-looking style for an unranked row's number — no CSS class churn
 *  since a real truncation control lands in a later task. */
const UNRANKED_STYLE: React.CSSProperties = { opacity: 0.45 };

/**
 * A ranked row. In view mode it is a full-quote "slip" whose number is a button
 * that opens the tap-to-assign popover; the quote leads and the grip drags.
 * In reorder mode it collapses to a compact two-line row that is itself the
 * drag handle, so the whole list fits and drags stay short (spec: Record).
 */
function RowContent({ quote, index, rank, reorderMode, onNumberClick, popOpen, dragHandleProps, onToggleTie, tieAbove, onSetRankedCount }: RowContentProps) {
  const unranked = rank == null;
  const label = unranked ? '' : rank;

  if (reorderMode) {
    return (
      <div className={`rank-mini${index > 2 ? ' rank-mini-sub' : ''}`} {...dragHandleProps}>
        <span className="rank-mini-grip" aria-hidden><GripIcon /></span>
        <span className="rank-mini-num" style={unranked ? UNRANKED_STYLE : undefined}>{label}</span>
        <span className="rank-mini-quote">{quote.text}</span>
      </div>
    );
  }

  const tieClass = `${quote.tieWithPrev ? ' rank-slip-tied' : ''}${tieAbove ? ' rank-slip-tie-above' : ''}`;
  const alsoAgreeClass = unranked ? ' rank-slip-also-agree' : '';

  return (
    <div className={`rank-slip ${index < 3 ? 'rank-slip-top' : 'rank-slip-sub'}${tieClass}${alsoAgreeClass}`}>
      <button
        type="button"
        className="rank-num"
        aria-haspopup="menu"
        aria-expanded={!!popOpen}
        aria-label={unranked ? 'Unranked. Tap to place in your top picks' : (index < 3 ? `Ranked ${rank}. Change position` : `Position ${rank}. Move to top three`)}
        onClick={(e) => onNumberClick?.(e, quote.id)}
      >
        <span className="rank-num-badge" style={unranked ? UNRANKED_STYLE : undefined}>{label}</span>
      </button>
      <div className="rank-slip-quote">
        <span>{quote.text}</span>
        {!unranked && (
          <button
            type="button"
            className="rank-truncate-btn"
            onClick={() => onSetRankedCount?.(index + 1)}
          >
            Place the rest as agreed
          </button>
        )}
      </div>
      {index > 0 && (
        <button
          type="button"
          className="rank-tie-btn"
          aria-pressed={!!quote.tieWithPrev}
          aria-label="Tie with the quote above"
          onClick={() => onToggleTie?.(quote.id)}
        >
          <span aria-hidden>=</span>
        </button>
      )}
      <button
        type="button"
        className="rank-grip"
        aria-label={unranked ? 'Reorder, unranked' : `Reorder, currently ranked ${rank}`}
        {...dragHandleProps}
      >
        <GripIcon />
      </button>
    </div>
  );
}

interface RowProps {
  quote: AgreedQuote;
  index: number;
  rank: number | null;
  reorderMode: boolean;
  onNumberClick?: (e: React.MouseEvent<HTMLButtonElement>, id: string) => void;
  popOpen?: boolean;
  /** True while a flight is landing on this row — hidden but still laid out so its box can be measured. */
  hidden?: boolean;
  onToggleTie?: (id: string) => void;
  tieAbove?: boolean;
  onSetRankedCount?: (n: number) => void;
}

const SortableRow: React.FC<RowProps> = ({ quote, index, rank, reorderMode, onNumberClick, popOpen, hidden, onToggleTie, tieAbove, onSetRankedCount }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: quote.id });

  return (
    <div
      ref={setNodeRef}
      data-quote-id={quote.id}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        visibility: hidden ? 'hidden' : undefined,
      }}
    >
      <motion.div
        layout
        style={{ opacity: isDragging ? 0 : 1 }}
        className={isDragging ? 'rank-row-dragging' : ''}
      >
        <RowContent
          quote={quote}
          index={index}
          rank={rank}
          reorderMode={reorderMode}
          onNumberClick={onNumberClick}
          popOpen={popOpen}
          dragHandleProps={{ ...attributes, ...listeners }}
          onToggleTie={onToggleTie}
          tieAbove={tieAbove}
          onSetRankedCount={onSetRankedCount}
        />
      </motion.div>
    </div>
  );
};

interface RankListProps {
  items: AgreedQuote[];
  onReorder: (orderedIds: string[]) => void;
  /** Tap-to-assign: place a quote at a 1-based podium position. */
  onAssign?: (id: string, position: number) => void;
  /** view mode only: toggle "tie with the quote above" for a row (id). */
  onToggleTie?: (id: string) => void;
  /** Collapse rows to compact draggable lines. */
  reorderMode?: boolean;
  emptyHint?: string;
  longPressDrag?: boolean;
  /** Id of a row currently being landed on by a verdict flight — rendered hidden for a seamless handoff. */
  landingId?: string | null;
  /** First N items (in `items` order) are ranked; the rest are unranked ("also agree").
   *  Defaults to `items.length`, i.e. everything ranked — today's no-truncation behavior. */
  rankedCount?: number;
  /** Set the truncation threshold: quotes at/after this index become unranked "also agree". */
  onSetRankedCount?: (n: number) => void;
}

export const RankList: React.FC<RankListProps> = ({ items, onReorder, onAssign, onToggleTie, reorderMode = false, emptyHint, longPressDrag, landingId, rankedCount, onSetRankedCount }) => {
  const [announcement, setAnnouncement] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pop, setPop] = useState<{ id: string; top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Resolved truncation threshold: everything ranked when unset (today's behavior).
  const effectiveRankedCount = rankedCount ?? items.length;

  // Derived (tie-aware, truncation-aware) rank per quote id, replacing plain
  // positional numbering. No ties + rankedCount === items.length (today's data)
  // yields the same 1..N sequence as before.
  const ranks = useMemo(
    () => deriveRanks(
      items.map((q) => q.id),
      items.map((q) => !!q.tieWithPrev),
      effectiveRankedCount,
    ),
    [items, effectiveRankedCount]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: longPressDrag ? { delay: 250, tolerance: 8 } : { distance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeItem = activeId ? items.find((q) => q.id === activeId) : null;
  const activeIndex = activeItem ? items.indexOf(activeItem) : -1;

  // Tap-to-assign popover: any click outside it (including the Reorder toggle or
  // a grip) closes it, so entering reorder mode never leaves a stale popover.
  useEffect(() => {
    if (!pop) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.rank-pop') && !t.closest('.rank-num')) setPop(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPop(null); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [pop]);

  const openPop = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    if (pop && pop.id === id) { setPop(null); return; }
    const badge = e.currentTarget.querySelector('.rank-num-badge') as HTMLElement | null;
    const wrap = wrapRef.current;
    if (!badge || !wrap) return;
    const wr = wrap.getBoundingClientRect();
    const br = badge.getBoundingClientRect();
    setPop({ id, top: br.bottom - wr.top + 6, left: Math.max(4, br.left - wr.left) });
  };

  const assign = (id: string, position: number) => {
    setPop(null);
    onAssign?.(id, position);
    const moved = items.find((q) => q.id === id);
    if (moved) {
      const stub = moved.text.length > 40 ? moved.text.slice(0, 40) + '…' : moved.text;
      setAnnouncement(`Moved "${stub}" to ${tierAnnouncement(position - 1, items.length)}`);
    }
  };

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = items.map((q) => q.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onReorder(next);
    const moved = items[from];
    const stub = moved.text.length > 40 ? moved.text.slice(0, 40) + '…' : moved.text;
    setAnnouncement(`Moved "${stub}" to ${tierAnnouncement(to, next.length)}`);
  };

  if (items.length === 0) {
    if (!emptyHint) return null;
    return (
      <div
        className="sidebar-empty-state"
        style={{ border: '1.5px dashed var(--border-subtle)', borderRadius: '8px', padding: '1.5rem 1rem', flexDirection: 'column', gap: '0.5rem' }}
      >
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center', margin: 0 }}>
          {emptyHint}
        </p>
      </div>
    );
  }

  const currentPos = pop ? items.findIndex((q) => q.id === pop.id) + 1 : 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((q) => q.id)} strategy={verticalListSortingStrategy}>
        <div ref={wrapRef} className="rank-list-wrap">
          {items.map((q, i) => (
            <React.Fragment key={q.id}>
              {effectiveRankedCount < items.length && i === effectiveRankedCount && (
                <div className="rank-rule">
                  <span>Also agreed</span>
                  {!reorderMode && (
                    <button
                      type="button"
                      className="rank-rule-btn"
                      onClick={() => onSetRankedCount?.(effectiveRankedCount + 1)}
                    >
                      Rank more
                    </button>
                  )}
                </div>
              )}
              <SortableRow
                quote={q}
                index={i}
                rank={ranks.get(q.id) ?? null}
                reorderMode={reorderMode}
                onNumberClick={openPop}
                popOpen={pop?.id === q.id}
                hidden={q.id === landingId}
                onToggleTie={onToggleTie}
                tieAbove={!!items[i + 1]?.tieWithPrev}
                onSetRankedCount={onSetRankedCount}
              />
            </React.Fragment>
          ))}

          {pop && !reorderMode && (
            <div className="rank-pop" role="menu" style={{ top: pop.top, left: pop.left }}>
              <span className="rank-pop-lab">Place</span>
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="menuitem"
                  className={currentPos === n ? 'cur' : undefined}
                  onClick={() => assign(pop.id, n)}
                >
                  {ORD[n]}
                </button>
              ))}
            </div>
          )}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem && activeIndex !== -1 ? (
          <div style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.18)', borderRadius: '0.625rem', overflow: 'hidden', opacity: 0.97 }}>
            <RowContent quote={activeItem} index={activeIndex} rank={ranks.get(activeItem.id) ?? null} reorderMode={reorderMode} />
          </div>
        ) : null}
      </DragOverlay>

      <div className="sr-only" role="status">{announcement}</div>
    </DndContext>
  );
};
