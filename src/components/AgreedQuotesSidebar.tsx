import React from 'react';
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
import { useReadRankStore, type Quote } from '../store/useReadRankStore';

interface CompactQuoteCardProps {
  quote: Quote;
}

const SortableCompactQuoteCard: React.FC<CompactQuoteCardProps> = ({ quote }) => {
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
    <div ref={setNodeRef} style={style} className="relative" {...attributes} {...listeners}>
      <div
        className="sidebar-quote-card relative overflow-visible cursor-grab active:cursor-grabbing"
        style={{
          transition: 'all 0.2s ease',
          boxShadow: isDragging ? '0 4px 16px rgba(0,0,0,0.1)' : undefined,
        }}
      >
        {/* Label */}
        <div className="flex items-center justify-between mb-2">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.5625rem', color: '#94a3b8' }}
          >
            Agreed
          </motion.span>
        </div>

        {/* Quote */}
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontWeight: 400, fontSize: '0.8125rem', lineHeight: 1.5, color: '#1a1a2e' }}>
          {quote.text}
        </div>
      </div>
    </div>
  );
};

export const AgreedQuotesSidebar: React.FC = () => {
  const {
    reorderAgreedQuotes,
    getCurrentIssueProgress,
  } = useReadRankStore();

  const progress = getCurrentIssueProgress();
  const agreedQuotes = progress?.agreedQuotes ?? [];
  const quotesToEvaluate = progress?.quotesToEvaluate ?? [];
  const currentQuoteIndex = progress?.currentQuoteIndex ?? 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = agreedQuotes.findIndex((q) => q.id === active.id);
      const newIndex = agreedQuotes.findIndex((q) => q.id === over.id);
      reorderAgreedQuotes(arrayMove(agreedQuotes, oldIndex, newIndex));
    }
  };

  const remainingQuotes = quotesToEvaluate.length - currentQuoteIndex;
  const isComplete = currentQuoteIndex >= quotesToEvaluate.length;

  return (
    <div className="agreed-quotes-sidebar">
      <div className="sidebar-header">
        <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.8125rem', color: '#2d2d44', margin: 0 }}>
          Agreed Quotes
        </h3>
        <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.6875rem', color: '#94a3b8' }}>
          {agreedQuotes.length}
        </span>
      </div>

      <div className="sidebar-quotes-list">
        {agreedQuotes.length === 0 ? (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sidebar-empty-state">
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                Quotes you agree with will appear here
              </p>
            </motion.div>
          </AnimatePresence>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={agreedQuotes.map((q) => q.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {agreedQuotes.map((quote) => (
                  <SortableCompactQuoteCard
                    key={quote.id}
                    quote={quote}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {!isComplete && (
        <div className="sidebar-progress">
          <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.625rem', color: '#94a3b8' }}>
            {remainingQuotes} quote{remainingQuotes !== 1 ? 's' : ''} remaining
          </span>
        </div>
      )}
    </div>
  );
};
