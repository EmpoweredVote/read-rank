import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useReadRankStore, type RankedQuote } from '../store/useReadRankStore';

interface CompactQuoteCardProps {
  quote: RankedQuote;
  rank: number;
  isNew: boolean;
}

const SortableCompactQuoteCard: React.FC<CompactQuoteCardProps> = ({ quote, rank, isNew }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: quote.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className="relative"
      {...attributes}
      {...listeners}
      animate={isNew ? { boxShadow: ['0 0 0 0 rgba(0,101,124,0)', '0 0 0 6px rgba(0,101,124,0.3)', '0 0 0 0 rgba(0,101,124,0)'] } : {}}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <div
        className="sidebar-quote-card relative overflow-visible cursor-grab active:cursor-grabbing"
        style={{
          transition: 'all 0.2s ease',
          boxShadow: isDragging ? '0 4px 16px rgba(0,0,0,0.1)' : undefined,
        }}
      >
        {/* Rank number */}
        <div className="flex items-center justify-between mb-2">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.625rem',
              fontWeight: 700,
              color: '#00657c',
              letterSpacing: '0.06em',
            }}
          >
            #{rank}
          </motion.span>
        </div>

        {/* Quote */}
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontWeight: 400, fontSize: '0.8125rem', lineHeight: 1.5, color: '#1a1a2e' }}>
          {quote.text}
        </div>
      </div>
    </motion.div>
  );
};

export const RankedListSidebar: React.FC = () => {
  const {
    reorderRankedQuotes,
    getCurrentIssueProgress,
  } = useReadRankStore();

  const progress = getCurrentIssueProgress();
  const rankedQuotes = progress?.rankedQuotes ?? [];
  const pendingRankQuoteId = progress?.pendingRankQuoteId ?? null;

  const listRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(rankedQuotes.length);

  useEffect(() => {
    if (rankedQuotes.length > prevCountRef.current) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }
    prevCountRef.current = rankedQuotes.length;
  }, [rankedQuotes.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = rankedQuotes.findIndex((q: RankedQuote) => q.id === active.id);
      const newIndex = rankedQuotes.findIndex((q: RankedQuote) => q.id === over.id);
      reorderRankedQuotes(arrayMove(rankedQuotes, oldIndex, newIndex));
    }
  };

  return (
    <div className="agreed-quotes-sidebar">
      <div className="sidebar-header">
        <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.8125rem', color: '#2d2d44', margin: 0 }}>
          Your Ranking ({rankedQuotes.length})
        </h3>
      </div>

      <div ref={listRef} className="sidebar-quotes-list" style={{ overflowY: 'auto', maxHeight: '60vh' }}>
        {rankedQuotes.length === 0 ? (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sidebar-empty-state">
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                Quotes you agree with will be ranked here
              </p>
            </motion.div>
          </AnimatePresence>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={rankedQuotes.map((q) => q.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {rankedQuotes.map((quote, index) => (
                  <SortableCompactQuoteCard
                    key={quote.id}
                    quote={quote}
                    rank={index + 1}
                    isNew={quote.id === pendingRankQuoteId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};

// Keep old name as alias for any remaining imports during transition
export const AgreedQuotesSidebar = RankedListSidebar;
