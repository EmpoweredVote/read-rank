// src/components/RankList.tsx
import React, { useState } from 'react';
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
import { TIER_META, tierAnnouncement, tierForIndex } from '../utils/tiers';
import { TierIcon } from './TierIcon';

const RANK_ORD = ['1st', '2nd', '3rd'];

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
  dragHandleProps?: Record<string, unknown>;
}

/**
 * The visual content of a ranked row — shared between SortableRow and DragOverlay,
 * and identical on desktop (rail) and mobile (sheet). A rank badge column (tier
 * tile + ordinal for the top three) keeps the quote at full length as the hero;
 * reorder is drag-only via the grip, keyboard-operable through dnd-kit's
 * KeyboardSensor (so no separate ▲▼ buttons).
 */
function RowContent({ quote, index, dragHandleProps }: RowContentProps) {
  const rank = index + 1;
  const tier = tierForIndex(index);
  const meta = TIER_META[tier];

  return (
    <div className={`tier-row tier-row-${tier} rank-row`}>
      <span className="rank-badge">
        <TierIcon tier={tier} size={28} />
        {tier !== 'bronze' && <span className={`rank-ord rank-ord-${tier}`}>{RANK_ORD[index]}</span>}
      </span>
      <div className="rank-row-quote">{quote.text}</div>
      <button
        type="button"
        className="rank-drag-handle"
        aria-label={`Reorder, currently ranked ${rank}, ${meta.name}`}
        style={{ background: 'none', border: 'none', padding: 0, display: 'flex', cursor: 'grab' }}
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
  /** True while a flight is landing on this row — hidden but still laid out so its box can be measured. */
  hidden?: boolean;
}

const SortableRow: React.FC<RowProps> = ({ quote, index, hidden }) => {
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
        <RowContent quote={quote} index={index} dragHandleProps={{ ...attributes, ...listeners }} />
      </motion.div>
    </div>
  );
};

interface RankListProps {
  items: AgreedQuote[];
  onReorder: (orderedIds: string[]) => void;
  emptyHint?: string;
  longPressDrag?: boolean;
  showGhostSlots?: boolean;
  /** Id of a row currently being landed on by a verdict flight — rendered hidden for a seamless handoff. */
  landingId?: string | null;
}

export const RankList: React.FC<RankListProps> = ({ items, onReorder, emptyHint, longPressDrag, showGhostSlots, landingId }) => {
  const [announcement, setAnnouncement] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: longPressDrag ? { delay: 250, tolerance: 8 } : { distance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeItem = activeId ? items.find((q) => q.id === activeId) : null;
  const activeIndex = activeItem ? items.indexOf(activeItem) : -1;

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

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

  if (items.length === 0 && !showGhostSlots) {
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((q) => q.id)} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {items.map((q, i) => (
            <SortableRow
              key={q.id}
              quote={q}
              index={i}
              hidden={q.id === landingId}
            />
          ))}
          {showGhostSlots && items.length < 3 &&
            Array.from({ length: 3 - items.length }, (_, k) => {
              const idx = items.length + k;
              const meta = TIER_META[tierForIndex(idx)];
              return (
                <div key={`ghost-${meta.tier}`} className={`tier-ghost tier-ghost-${meta.tier}`} aria-hidden="true">
                  <TierIcon tier={meta.tier} size={14} />
                  <span>{meta.label}</span>
                </div>
              );
            })}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem && activeIndex !== -1 ? (
          <div style={{
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            transform: 'scale(1.02)',
            borderRadius: '0.5rem',
            overflow: 'hidden',
            opacity: 0.95,
          }}>
            <RowContent quote={activeItem} index={activeIndex} />
          </div>
        ) : null}
      </DragOverlay>

      <div className="sr-only" role="status">{announcement}</div>
    </DndContext>
  );
};
