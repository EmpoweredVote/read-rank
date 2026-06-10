import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
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

const PODIUM_LABELS = ['1st', '2nd', '3rd'];

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" />
    </svg>
  );
}

interface RowProps {
  quote: AgreedQuote;
  index: number;
  compact?: boolean;
  onMove?: (from: number, dir: -1 | 1) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const SortableRow: React.FC<RowProps> = ({ quote, index, compact, onMove, isFirst, isLast }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: quote.id });
  const rank = index + 1;
  const isPodium = index < 3;
  const badgeClass = `podium-rank-badge ${rank === 1 ? 'r1' : rank === 2 ? 'r2' : rank === 3 ? 'r3' : 'rN'}`;
  const podiumClass = rank === 1 ? 'podium-1' : rank === 2 ? 'podium-2' : rank === 3 ? 'podium-3' : '';

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        backgroundColor: 'var(--surface-sunken)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '0.5rem',
        padding: compact ? '0.5rem 0.625rem' : '0.625rem 0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        opacity: isDragging ? 0.85 : 1,
      }}
      className={`${podiumClass} ${isDragging ? 'rank-row-dragging' : ''}`}
    >
      <button
        type="button"
        className="rank-drag-handle"
        aria-label={`Reorder — currently ranked ${rank}`}
        {...attributes}
        {...listeners}
        style={{ background: 'none', border: 'none', padding: 0, display: 'flex' }}
      >
        <GripIcon />
      </button>

      <span className={badgeClass}>{rank}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {isPodium && (
          <div
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 700,
              fontSize: '0.625rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
              marginBottom: '0.125rem',
            }}
          >
            {PODIUM_LABELS[index]} choice
          </div>
        )}
        <div
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 400,
            fontSize: compact ? '0.75rem' : '0.8125rem',
            lineHeight: 1.45,
            color: 'var(--text-ink)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {quote.text}
        </div>
      </div>

      {onMove && (
        <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.125rem' }}>
          <button
            type="button"
            className="rank-move-button"
            aria-label={`Move up — currently ranked ${rank}`}
            disabled={isFirst}
            onClick={() => onMove(index, -1)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 15l-6-6-6 6" /></svg>
          </button>
          <button
            type="button"
            className="rank-move-button"
            aria-label={`Move down — currently ranked ${rank}`}
            disabled={isLast}
            onClick={() => onMove(index, 1)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </button>
        </span>
      )}
    </div>
  );
};

interface RankListProps {
  items: AgreedQuote[];
  onReorder: (orderedIds: string[]) => void;
  compact?: boolean;
  emptyHint?: string;
  /** 250ms long-press drag activation — use inside scrollable sheets. */
  longPressDrag?: boolean;
  /** Pointer-free reorder: 44px up/down buttons per row. */
  showMoveButtons?: boolean;
}

export const RankList: React.FC<RankListProps> = ({ items, onReorder, compact, emptyHint, longPressDrag, showMoveButtons }) => {
  const [announcement, setAnnouncement] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: longPressDrag ? { delay: 250, tolerance: 8 } : { distance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleMove = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= items.length) return;
    const ids = items.map((q) => q.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    onReorder(ids);
    setAnnouncement(`Moved to position ${to + 1} of ${ids.length}`);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = items.map((q) => q.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onReorder(next);
  };

  if (items.length === 0) {
    return (
      <div
        className="sidebar-empty-state"
        style={{
          border: '1.5px dashed var(--border-subtle)',
          borderRadius: '8px',
          padding: '1.5rem 1rem',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--border-medium)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h10M4 18h7" />
        </svg>
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center', margin: 0 }}>
          {emptyHint ?? 'Agree with quotes, then drag to rank them. Your top 3 form your podium.'}
        </p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((q) => q.id)} strategy={verticalListSortingStrategy}>
        <motion.div layout style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {items.map((q, i) => (
            <SortableRow
              key={q.id}
              quote={q}
              index={i}
              compact={compact}
              onMove={showMoveButtons ? handleMove : undefined}
              isFirst={i === 0}
              isLast={i === items.length - 1}
            />
          ))}
        </motion.div>
      </SortableContext>
      <div className="sr-only" role="status">{announcement}</div>
    </DndContext>
  );
};
