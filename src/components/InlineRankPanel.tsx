import React from 'react';
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

interface InlineSortableCardProps {
  quote: RankedQuote;
  rank: number;
  isPending: boolean;
}

const InlineSortableCard: React.FC<InlineSortableCardProps> = ({ quote, rank, isPending }) => {
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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        className={`sidebar-quote-card cursor-grab active:cursor-grabbing ${isPending ? 'pending-card' : ''}`}
        style={{
          transition: 'all 0.2s ease',
          boxShadow: isDragging ? '0 4px 16px rgba(0,0,0,0.1)' : undefined,
          borderLeft: isPending ? '3px solid #00657c' : undefined,
          backgroundColor: isPending ? '#ecfeff' : undefined,
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
          <span style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: '0.625rem',
            fontWeight: 700,
            color: '#00657c',
            letterSpacing: '0.06em',
          }}>
            #{rank}
          </span>
          {isPending && (
            <span style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.625rem',
              color: '#0e7490',
              fontStyle: 'italic',
            }}>
              Place me
            </span>
          )}
        </div>
        {/* Quote text */}
        <div style={{
          fontFamily: "'Fraunces', serif",
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: '0.8125rem',
          lineHeight: 1.5,
          color: '#1a1a2e',
        }}>
          {quote.text}
        </div>
      </div>
    </div>
  );
};

interface InlineRankPanelProps {
  onDismiss: () => void;
}

export const InlineRankPanel: React.FC<InlineRankPanelProps> = ({ onDismiss }) => {
  const { getCurrentIssueProgress, insertAtRank, reorderRankedQuotes } = useReadRankStore();

  const progress = getCurrentIssueProgress();
  const rankedQuotes = progress?.rankedQuotes ?? [];
  const pendingRankQuoteId = progress?.pendingRankQuoteId ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rankedQuotes.findIndex((q) => q.id === active.id);
    const newIndex = rankedQuotes.findIndex((q) => q.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    if (active.id === pendingRankQuoteId) {
      insertAtRank(String(active.id), newIndex);
    } else {
      reorderRankedQuotes(arrayMove(rankedQuotes, oldIndex, newIndex));
    }
  };

  return (
    <div className="inline-rank-panel">
      {/* Title */}
      <p style={{
        fontFamily: "'Manrope', sans-serif",
        fontSize: '0.75rem',
        fontWeight: 700,
        color: '#2d2d44',
        marginBottom: '0.75rem',
        marginTop: 0,
      }}>
        {pendingRankQuoteId ? 'Drag to rank this quote' : 'Your Ranking'}
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rankedQuotes.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rankedQuotes.map((quote, index) => (
              <InlineSortableCard
                key={quote.id}
                quote={quote}
                rank={index + 1}
                isPending={quote.id === pendingRankQuoteId}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Continue button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
        <button
          onClick={onDismiss}
          className="ev-button-secondary"
          style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
};
