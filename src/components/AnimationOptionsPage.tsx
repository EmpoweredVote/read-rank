import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sample quotes for testing
const sampleQuotes = [
  { id: 'sample-1', text: 'We need to invest in renewable energy sources to combat climate change and create new jobs.' },
  { id: 'sample-2', text: 'Education funding should prioritize teacher salaries and modern classroom resources.' },
  { id: 'sample-3', text: 'Healthcare access should be a right, not a privilege based on income level.' },
];

type DragStyle = 'default' | 'slot-machine' | 'card-game' | 'puzzle-piece' | 'gravity-drop';
type BadgeStyle = 'default' | 'animated-gradient' | 'holographic' | 'neon-pulse' | 'royal-seal';

// ============================================
// ORNATE BADGE ICONS - Inspired by premium medals
// ============================================

const OrnateDiamondIcon: React.FC<{ size?: number; isActive: boolean }> = ({ size = 48, isActive }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Decorative outer ring */}
    <circle cx="32" cy="32" r="30" fill="none" stroke={isActive ? "url(#diamondRingGrad)" : "#9CA3AF"} strokeWidth="2"/>

    {/* Scalloped border */}
    {[...Array(16)].map((_, i) => {
      const angle = (i * 22.5) * Math.PI / 180;
      const x = 32 + 26 * Math.cos(angle);
      const y = 32 + 26 * Math.sin(angle);
      return (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="3"
          fill={isActive ? "#22d3ee" : "#9CA3AF"}
          opacity={isActive ? 0.8 : 0.4}
        />
      );
    })}

    {/* Inner decorative circle */}
    <circle cx="32" cy="32" r="22" fill={isActive ? "url(#diamondInnerGrad)" : "#E5E7EB"} stroke={isActive ? "#0891b2" : "#6B7280"} strokeWidth="1.5"/>

    {/* Diamond shape */}
    <path
      d="M32 12L22 24L32 52L42 24L32 12Z"
      fill={isActive ? "url(#diamondFaceGrad)" : "#D1D5DB"}
      stroke={isActive ? "#0e7490" : "#6B7280"}
      strokeWidth="1"
    />
    <path d="M32 12L22 24H42L32 12Z" fill={isActive ? "#a5f3fc" : "#E5E7EB"} opacity="0.9"/>
    <path d="M22 24L32 52V24H22Z" fill={isActive ? "#22d3ee" : "#9CA3AF"} opacity="0.6"/>

    {/* Sparkle highlights */}
    {isActive && (
      <>
        <circle cx="26" cy="20" r="2" fill="#ffffff" opacity="0.9"/>
        <circle cx="38" cy="28" r="1.5" fill="#ffffff" opacity="0.7"/>
        <circle cx="30" cy="36" r="1" fill="#ffffff" opacity="0.6"/>
      </>
    )}

    {/* Stars at top */}
    <g transform="translate(32, 8)">
      <polygon points="0,-4 1,-1 4,-1 2,1 3,4 0,2 -3,4 -2,1 -4,-1 -1,-1" fill={isActive ? "#fcd34d" : "#9CA3AF"} transform="scale(0.6)"/>
    </g>

    <defs>
      <linearGradient id="diamondRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#67e8f9"/>
        <stop offset="50%" stopColor="#22d3ee"/>
        <stop offset="100%" stopColor="#0891b2"/>
      </linearGradient>
      <linearGradient id="diamondInnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#cffafe"/>
        <stop offset="100%" stopColor="#a5f3fc"/>
      </linearGradient>
      <linearGradient id="diamondFaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e0f7ff"/>
        <stop offset="30%" stopColor="#67e8f9"/>
        <stop offset="70%" stopColor="#22d3ee"/>
        <stop offset="100%" stopColor="#0891b2"/>
      </linearGradient>
    </defs>
  </svg>
);

const OrnateGoldIcon: React.FC<{ size?: number; isActive: boolean }> = ({ size = 48, isActive }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Ribbon tails */}
    <path d="M18 54L12 64L18 58L24 64L18 54Z" fill={isActive ? "#dc2626" : "#9CA3AF"}/>
    <path d="M46 54L40 64L46 58L52 64L46 54Z" fill={isActive ? "#dc2626" : "#9CA3AF"}/>
    <path d="M18 42V56" stroke={isActive ? "#b91c1c" : "#6B7280"} strokeWidth="8" strokeLinecap="round"/>
    <path d="M46 42V56" stroke={isActive ? "#b91c1c" : "#6B7280"} strokeWidth="8" strokeLinecap="round"/>

    {/* Main medal body - hexagonal inspired */}
    <path
      d="M32 4L52 16V40L32 52L12 40V16L32 4Z"
      fill={isActive ? "url(#goldBodyGrad)" : "#E5E7EB"}
      stroke={isActive ? "#92400e" : "#6B7280"}
      strokeWidth="2"
    />

    {/* Inner circle */}
    <circle cx="32" cy="28" r="18" fill={isActive ? "url(#goldInnerGrad)" : "#D1D5DB"} stroke={isActive ? "#b45309" : "#6B7280"} strokeWidth="1.5"/>

    {/* Decorative inner ring */}
    <circle cx="32" cy="28" r="14" fill="none" stroke={isActive ? "#fcd34d" : "#9CA3AF"} strokeWidth="1" strokeDasharray="3 2"/>

    {/* Central star */}
    <polygon
      points="32,14 35,22 44,22 37,28 40,36 32,31 24,36 27,28 20,22 29,22"
      fill={isActive ? "#fef3c7" : "#E5E7EB"}
      stroke={isActive ? "#b45309" : "#6B7280"}
      strokeWidth="0.5"
    />

    {/* Three stars at top */}
    <g transform="translate(22, 10)">
      <polygon points="0,-3 0.8,-0.8 3,-0.8 1.2,0.8 2,3 0,1.5 -2,3 -1.2,0.8 -3,-0.8 -0.8,-0.8" fill={isActive ? "#fcd34d" : "#9CA3AF"} transform="scale(0.5)"/>
    </g>
    <g transform="translate(32, 7)">
      <polygon points="0,-3 0.8,-0.8 3,-0.8 1.2,0.8 2,3 0,1.5 -2,3 -1.2,0.8 -3,-0.8 -0.8,-0.8" fill={isActive ? "#fcd34d" : "#9CA3AF"} transform="scale(0.6)"/>
    </g>
    <g transform="translate(42, 10)">
      <polygon points="0,-3 0.8,-0.8 3,-0.8 1.2,0.8 2,3 0,1.5 -2,3 -1.2,0.8 -3,-0.8 -0.8,-0.8" fill={isActive ? "#fcd34d" : "#9CA3AF"} transform="scale(0.5)"/>
    </g>

    {/* Highlight */}
    {isActive && (
      <ellipse cx="26" cy="22" rx="3" ry="2" fill="#ffffff" opacity="0.6"/>
    )}

    <defs>
      <linearGradient id="goldBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef3c7"/>
        <stop offset="30%" stopColor="#fcd34d"/>
        <stop offset="70%" stopColor="#f59e0b"/>
        <stop offset="100%" stopColor="#b45309"/>
      </linearGradient>
      <linearGradient id="goldInnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef9c3"/>
        <stop offset="50%" stopColor="#fde047"/>
        <stop offset="100%" stopColor="#eab308"/>
      </linearGradient>
    </defs>
  </svg>
);

// ============================================
// ANIMATED GRADIENT BORDER COMPONENT
// ============================================

const AnimatedGradientBorder: React.FC<{
  type: 'diamond' | 'gold';
  style: BadgeStyle;
  children: React.ReactNode;
}> = ({ type, style, children }) => {
  const isDiamond = type === 'diamond';

  if (style === 'animated-gradient') {
    return (
      <div className="relative p-[3px] rounded-xl overflow-hidden">
        {/* Animated gradient border */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: isDiamond
              ? 'conic-gradient(from 0deg, #22d3ee, #0891b2, #164e63, #22d3ee)'
              : 'conic-gradient(from 0deg, #fcd34d, #f59e0b, #92400e, #fcd34d)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        <div className="relative bg-ev-muted-blue rounded-[10px]">
          {children}
        </div>
      </div>
    );
  }

  if (style === 'holographic') {
    return (
      <div className="relative p-[3px] rounded-xl overflow-hidden">
        {/* Holographic shimmer */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: isDiamond
              ? 'linear-gradient(90deg, #22d3ee, #a855f7, #ec4899, #22d3ee, #a855f7)'
              : 'linear-gradient(90deg, #fcd34d, #f97316, #ef4444, #fcd34d, #f97316)',
            backgroundSize: '200% 100%',
          }}
          animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        <div className="relative bg-ev-muted-blue rounded-[10px]">
          {children}
        </div>
      </div>
    );
  }

  if (style === 'neon-pulse') {
    const color = isDiamond ? '#22d3ee' : '#fcd34d';
    const colorRgb = isDiamond ? '34, 211, 238' : '252, 211, 77';
    return (
      <motion.div
        className="relative rounded-xl"
        style={{
          border: `3px solid ${color}`,
        }}
        animate={{
          boxShadow: [
            `0 0 5px rgba(${colorRgb}, 0.5), inset 0 0 5px rgba(${colorRgb}, 0.1)`,
            `0 0 20px rgba(${colorRgb}, 0.8), inset 0 0 15px rgba(${colorRgb}, 0.2)`,
            `0 0 5px rgba(${colorRgb}, 0.5), inset 0 0 5px rgba(${colorRgb}, 0.1)`,
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    );
  }

  if (style === 'royal-seal') {
    return (
      <div className="relative">
        {/* Corner ornaments */}
        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
          <motion.div
            key={corner}
            className={`absolute w-6 h-6 ${
              corner.includes('top') ? '-top-2' : '-bottom-2'
            } ${corner.includes('left') ? '-left-2' : '-right-2'} z-10`}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          >
            <svg viewBox="0 0 24 24" fill={isDiamond ? '#22d3ee' : '#fcd34d'}>
              <path d="M12 2L14 8L20 8L15 12L17 18L12 14L7 18L9 12L4 8L10 8L12 2Z"/>
            </svg>
          </motion.div>
        ))}
        {/* Border with gradient */}
        <div
          className="rounded-xl p-[3px]"
          style={{
            background: isDiamond
              ? 'linear-gradient(135deg, #22d3ee 0%, #0891b2 50%, #22d3ee 100%)'
              : 'linear-gradient(135deg, #fcd34d 0%, #b45309 50%, #fcd34d 100%)',
          }}
        >
          <div className="bg-ev-muted-blue rounded-[10px]">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Default - simple ring
  return (
    <div className={`rounded-xl ring-2 ${isDiamond ? 'ring-cyan-400' : 'ring-amber-400'}`}>
      {children}
    </div>
  );
};

// ============================================
// DRAG AND DROP - with drop zones and jello
// ============================================

interface SortableCardProps {
  quote: { id: string; text: string };
  style: DragStyle;
  isOver: boolean;
  justDropped: boolean;
  index: number;
}

const SortableCard: React.FC<SortableCardProps> = ({ quote, style, isOver, justDropped, index }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: quote.id });

  const baseStyle = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 250ms cubic-bezier(0.25, 1, 0.5, 1)',
    zIndex: isDragging ? 50 : index,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div className="relative">
      {/* Drop zone indicator */}
      <AnimatePresence>
        {isOver && !isDragging && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className={`
              absolute inset-0 rounded-xl border-2 border-dashed
              ${style === 'card-game' ? 'border-amber-400 bg-amber-400/10' : ''}
              ${style === 'slot-machine' ? 'border-green-400 bg-green-400/10' : ''}
              ${style === 'puzzle-piece' ? 'border-purple-400 bg-purple-400/10' : ''}
              ${style === 'gravity-drop' ? 'border-blue-400 bg-blue-400/10' : ''}
              ${style === 'default' ? 'border-ev-light-blue bg-ev-light-blue/10' : ''}
            `} />
            <motion.div
              className="absolute inset-0 flex items-center justify-center text-sm font-bold"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <span className={`
                px-3 py-1 rounded-full
                ${style === 'card-game' ? 'bg-amber-400 text-amber-900' : ''}
                ${style === 'slot-machine' ? 'bg-green-400 text-green-900' : ''}
                ${style === 'puzzle-piece' ? 'bg-purple-400 text-purple-900' : ''}
                ${style === 'gravity-drop' ? 'bg-blue-400 text-blue-900' : ''}
                ${style === 'default' ? 'bg-ev-light-blue text-white' : ''}
              `}>
                Drop Here
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        ref={setNodeRef}
        style={baseStyle}
        {...attributes}
        {...listeners}
        className={`
          ev-quote-card cursor-grab active:cursor-grabbing relative
          ${isDragging ? 'shadow-2xl' : ''}
        `}
        animate={justDropped ? getDropAnimation(style) : {}}
      >
        <p className="font-manrope text-sm leading-relaxed">{quote.text}</p>

        {/* Rank number indicator */}
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-ev-coral rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
          {index + 1}
        </div>
      </motion.div>
    </div>
  );
};

// Get the jello/bounce animation for when card is dropped
const getDropAnimation = (style: DragStyle) => {
  switch (style) {
    case 'slot-machine':
      // Slot machine - bounce down and settle
      return {
        y: [0, -10, 5, -3, 0],
        scale: [1, 1.02, 0.98, 1.01, 1],
        transition: { duration: 0.5, ease: 'easeOut' as const }
      };
    case 'card-game':
      // Card game - flip and land
      return {
        rotateY: [0, 10, -5, 0],
        scale: [1, 1.05, 0.95, 1],
        transition: { duration: 0.4, ease: 'easeOut' as const }
      };
    case 'puzzle-piece':
      // Puzzle - snap into place with satisfaction
      return {
        scale: [0.9, 1.1, 0.95, 1.02, 1],
        rotate: [0, 2, -1, 0],
        transition: { duration: 0.5, type: 'spring' as const, stiffness: 400 }
      };
    case 'gravity-drop':
      // Gravity - heavy thud with squash
      return {
        scaleX: [1, 1.15, 0.9, 1.05, 1],
        scaleY: [1, 0.85, 1.1, 0.95, 1],
        y: [0, 5, -2, 0],
        transition: { duration: 0.4, ease: 'easeOut' as const }
      };
    default:
      // Jello horizontal
      return {
        scaleX: [1, 1.25, 0.75, 1.15, 0.95, 1.05, 1],
        scaleY: [1, 0.75, 1.25, 0.85, 1.05, 0.95, 1],
        transition: { duration: 0.6, ease: 'easeOut' as const }
      };
  }
};

// Drag overlay - the ghost card being dragged
const DragOverlayCard: React.FC<{ quote: { id: string; text: string }; style: DragStyle }> = ({ quote, style }) => {
  const getOverlayStyle = () => {
    switch (style) {
      case 'slot-machine':
        return 'shadow-[0_10px_40px_rgba(34,197,94,0.4)] border-2 border-green-400';
      case 'card-game':
        return 'shadow-[0_10px_40px_rgba(251,191,36,0.4)] border-2 border-amber-400 rotate-3';
      case 'puzzle-piece':
        return 'shadow-[0_10px_40px_rgba(168,85,247,0.4)] border-2 border-purple-400';
      case 'gravity-drop':
        return 'shadow-[0_10px_40px_rgba(59,130,246,0.4)] border-2 border-blue-400';
      default:
        return 'shadow-2xl';
    }
  };

  return (
    <motion.div
      className={`ev-quote-card ${getOverlayStyle()} cursor-grabbing`}
      initial={{ scale: 1, rotate: 0 }}
      animate={{
        scale: 1.05,
        rotate: style === 'card-game' ? 5 : 0,
      }}
    >
      <p className="font-manrope text-sm leading-relaxed">{quote.text}</p>
    </motion.div>
  );
};

// ============================================
// BADGE CARD - with animated borders
// ============================================

interface BadgeCardProps {
  quote: { id: string; text: string };
  badgeStyle: BadgeStyle;
  diamondId: string | null;
  goldId: string | null;
  onAssignBadge: (id: string, badge: 'diamond' | 'gold') => void;
}

const BadgeCard: React.FC<BadgeCardProps> = ({
  quote,
  badgeStyle,
  diamondId,
  goldId,
  onAssignBadge,
}) => {
  const hasDiamond = diamondId === quote.id;
  const hasGold = goldId === quote.id;
  const hasBadge = hasDiamond || hasGold;
  const badgeType = hasDiamond ? 'diamond' : hasGold ? 'gold' : null;

  const cardContent = (
    <div className="p-5 relative">
      {/* Floating badge indicator */}
      <AnimatePresence>
        {hasBadge && (
          <motion.div
            className="absolute -top-6 -left-6 z-20"
            initial={{ scale: 0, rotate: -180, y: 20 }}
            animate={{ scale: 1, rotate: 0, y: 0 }}
            exit={{ scale: 0, rotate: 180, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {hasDiamond ? (
              <OrnateDiamondIcon size={56} isActive={true} />
            ) : (
              <OrnateGoldIcon size={56} isActive={true} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status label */}
      <div className={`mb-3 ${hasBadge ? 'pl-12' : ''}`}>
        <AnimatePresence mode="wait">
          {hasBadge ? (
            <motion.span
              key="badge-label"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className={`
                font-manrope font-bold text-sm px-3 py-1 rounded-full inline-block
                ${hasDiamond ? 'bg-cyan-100 text-cyan-700' : 'bg-amber-100 text-amber-700'}
              `}
            >
              {hasDiamond ? '💎 Your Top Pick' : '🏆 Runner Up'}
            </motion.span>
          ) : (
            <motion.span
              key="default-label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-manrope text-xs text-white/60"
            >
              Statement
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Quote text */}
      <p className={`font-manrope text-sm leading-relaxed mb-4 ${hasBadge ? 'pl-12' : ''}`}>
        {quote.text}
      </p>

      {/* Badge selection */}
      <div className="border-t border-white/20 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50 font-manrope">Award a badge:</span>
          <div className="flex gap-4">
            <motion.button
              onClick={() => onAssignBadge(quote.id, 'diamond')}
              className={`
                relative p-1 rounded-lg transition-all
                ${hasDiamond ? '' : 'hover:bg-white/10'}
              `}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <OrnateDiamondIcon size={40} isActive={hasDiamond} />
              <span className={`block text-[10px] mt-1 text-center font-manrope ${hasDiamond ? 'text-cyan-400' : 'text-white/40'}`}>
                Diamond
              </span>
            </motion.button>

            <motion.button
              onClick={() => onAssignBadge(quote.id, 'gold')}
              className={`
                relative p-1 rounded-lg transition-all
                ${hasGold ? '' : 'hover:bg-white/10'}
              `}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <OrnateGoldIcon size={40} isActive={hasGold} />
              <span className={`block text-[10px] mt-1 text-center font-manrope ${hasGold ? 'text-amber-400' : 'text-white/40'}`}>
                Gold
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );

  if (hasBadge && badgeType) {
    return (
      <AnimatedGradientBorder type={badgeType} style={badgeStyle}>
        {cardContent}
      </AnimatedGradientBorder>
    );
  }

  return (
    <div className="ev-quote-card">
      {cardContent}
    </div>
  );
};

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export const AnimationOptionsPage: React.FC = () => {
  const [dragStyle, setDragStyle] = useState<DragStyle>('default');
  const [badgeStyle, setBadgeStyle] = useState<BadgeStyle>('animated-gradient');
  const [dragQuotes, setDragQuotes] = useState(sampleQuotes);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [justDroppedId, setJustDroppedId] = useState<string | null>(null);
  const [diamondId, setDiamondId] = useState<string | null>(null);
  const [goldId, setGoldId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string | null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (over && active.id !== over.id) {
      const oldIndex = dragQuotes.findIndex((q) => q.id === active.id);
      const newIndex = dragQuotes.findIndex((q) => q.id === over.id);
      setDragQuotes(arrayMove(dragQuotes, oldIndex, newIndex));

      // Trigger drop animation
      setJustDroppedId(active.id as string);
      setTimeout(() => setJustDroppedId(null), 700);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  const handleAssignBadge = (quoteId: string, badge: 'diamond' | 'gold') => {
    if (badge === 'diamond') {
      setDiamondId(diamondId === quoteId ? null : quoteId);
      if (goldId === quoteId) setGoldId(null);
    } else {
      setGoldId(goldId === quoteId ? null : quoteId);
      if (diamondId === quoteId) setDiamondId(null);
    }
  };

  const activeQuote = activeId ? dragQuotes.find(q => q.id === activeId) : null;

  const dragStyles: { id: DragStyle; name: string; description: string }[] = [
    { id: 'default', name: 'Jello Bounce', description: 'Squash and stretch on land' },
    { id: 'slot-machine', name: 'Slot Machine', description: 'Green glow, bounce settle' },
    { id: 'card-game', name: 'Card Game', description: 'Gold glow, slight tilt' },
    { id: 'puzzle-piece', name: 'Puzzle Snap', description: 'Purple glow, snap in place' },
    { id: 'gravity-drop', name: 'Gravity Drop', description: 'Blue glow, heavy squash' },
  ];

  const badgeStyles: { id: BadgeStyle; name: string; description: string }[] = [
    { id: 'animated-gradient', name: 'Rotating Gradient', description: 'Spinning conic gradient border' },
    { id: 'holographic', name: 'Holographic', description: 'Rainbow shimmer effect' },
    { id: 'neon-pulse', name: 'Neon Pulse', description: 'Glowing neon border' },
    { id: 'royal-seal', name: 'Royal Seal', description: 'Star corners, gradient border' },
    { id: 'default', name: 'Simple Ring', description: 'Basic colored ring' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 max-w-5xl">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="text-ev-light-blue hover:text-ev-coral transition-colors flex items-center gap-2 font-manrope"
            >
              <span className="text-lg">←</span>
              <span>Back to App</span>
            </Link>
            <h1 className="ev-heading text-xl md:text-2xl">Animation Options</h1>
            <div className="w-24" />
          </div>
        </div>
      </header>

      {/* Notice Banner */}
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="container mx-auto px-4 py-3 max-w-5xl">
          <p className="text-amber-800 text-sm font-manrope text-center">
            <strong>Note:</strong> These animations are for testing different approaches only. They are not implemented in the main application.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-12">
        {/* DRAG AND DROP SECTION */}
        <section>
          <h2 className="ev-heading text-lg md:text-xl mb-2">Drag & Drop Styles</h2>
          <p className="ev-text-secondary text-sm mb-4">
            Drag the cards to reorder them. Notice the drop zone indicator and satisfying landing animation.
          </p>

          {/* Style selector */}
          <div className="flex flex-wrap gap-2 mb-6">
            {dragStyles.map((style) => (
              <button
                key={style.id}
                onClick={() => setDragStyle(style.id)}
                className={`
                  px-4 py-2 rounded-lg font-manrope text-sm transition-all
                  ${dragStyle === style.id
                    ? 'bg-ev-muted-blue text-white shadow-lg'
                    : 'bg-white border border-gray-200 hover:border-ev-light-blue'
                  }
                `}
              >
                <span className="font-semibold">{style.name}</span>
                <span className="hidden sm:inline text-xs opacity-70 ml-2">
                  {style.description}
                </span>
              </button>
            ))}
          </div>

          {/* Draggable cards */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext
                items={dragQuotes.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4 max-w-xl mx-auto">
                  {dragQuotes.map((quote, index) => (
                    <SortableCard
                      key={quote.id}
                      quote={quote}
                      style={dragStyle}
                      isOver={overId === quote.id && activeId !== quote.id}
                      justDropped={justDroppedId === quote.id}
                      index={index}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeQuote ? (
                  <DragOverlayCard quote={activeQuote} style={dragStyle} />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </section>

        {/* BADGE SECTION */}
        <section>
          <h2 className="ev-heading text-lg md:text-xl mb-2">Badge Animation Styles</h2>
          <p className="ev-text-secondary text-sm mb-4">
            Click the badges to see animated gradient borders applied to the entire card.
          </p>

          {/* Style selector */}
          <div className="flex flex-wrap gap-2 mb-6">
            {badgeStyles.map((style) => (
              <button
                key={style.id}
                onClick={() => {
                  setBadgeStyle(style.id);
                  // Reset to show animation fresh
                  setDiamondId(null);
                  setGoldId(null);
                }}
                className={`
                  px-4 py-2 rounded-lg font-manrope text-sm transition-all
                  ${badgeStyle === style.id
                    ? 'bg-ev-muted-blue text-white shadow-lg'
                    : 'bg-white border border-gray-200 hover:border-ev-light-blue'
                  }
                `}
              >
                <span className="font-semibold">{style.name}</span>
                <span className="hidden sm:inline text-xs opacity-70 ml-2">
                  {style.description}
                </span>
              </button>
            ))}
          </div>

          {/* Badge status */}
          <div className="flex gap-4 mb-4 justify-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
              diamondId ? 'bg-cyan-500/20 ring-2 ring-cyan-400' : 'bg-gray-100'
            }`}>
              <OrnateDiamondIcon size={24} isActive={!!diamondId} />
              <span className={`text-xs font-manrope ${
                diamondId ? 'text-cyan-700 font-bold' : 'text-gray-500'
              }`}>
                Diamond {diamondId ? 'awarded' : 'available'}
              </span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
              goldId ? 'bg-amber-500/20 ring-2 ring-amber-400' : 'bg-gray-100'
            }`}>
              <OrnateGoldIcon size={24} isActive={!!goldId} />
              <span className={`text-xs font-manrope ${
                goldId ? 'text-amber-700 font-bold' : 'text-gray-500'
              }`}>
                Gold {goldId ? 'awarded' : 'available'}
              </span>
            </div>
          </div>

          {/* Cards with badges */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="space-y-6 max-w-xl mx-auto">
              {sampleQuotes.map((quote) => (
                <BadgeCard
                  key={quote.id}
                  quote={quote}
                  badgeStyle={badgeStyle}
                  diamondId={diamondId}
                  goldId={goldId}
                  onAssignBadge={handleAssignBadge}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Reset buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => {
              setDiamondId(null);
              setGoldId(null);
            }}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-manrope text-sm transition-colors"
          >
            Reset Badges
          </button>
          <button
            onClick={() => setDragQuotes([...sampleQuotes])}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-manrope text-sm transition-colors"
          >
            Reset Card Order
          </button>
        </div>
      </div>
    </div>
  );
};
