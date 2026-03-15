import React, { useState, useRef, useCallback } from 'react';
import type { RankedQuote } from '../store/useReadRankStore';

interface MatchCardProps {
  quote: RankedQuote;
  side: 'left' | 'right';
  onPick: (side: 'left' | 'right') => void;
  selected: 'left' | 'right' | null;
  disabled: boolean;
}

interface Particle {
  dx: number;
  dy: number;
  size: number;
  delay: number;
  isLarge: boolean;
}

const MegaParticles: React.FC<{ active: boolean }> = ({ active }) => {
  const particlesRef = useRef<Particle[]>([]);

  if (particlesRef.current.length === 0) {
    particlesRef.current = Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * 360;
      const dist = 40 + Math.random() * 70;
      const dx = Math.cos((angle * Math.PI) / 180) * dist;
      const dy = Math.sin((angle * Math.PI) / 180) * dist;
      const size = 2 + Math.random() * 5;
      const delay = Math.random() * 0.15;
      const isLarge = i % 4 === 0;
      return { dx, dy, size, delay, isLarge };
    });
  }

  if (!active) return null;

  return (
    <div style={{ position: 'absolute', inset: -20, pointerEvents: 'none', zIndex: 20 }}>
      {particlesRef.current.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: p.isLarge ? p.size * 2 : p.size,
            height: p.isLarge ? p.size * 2 : p.size,
            borderRadius: '50%',
            background: p.isLarge
              ? 'radial-gradient(circle, #ff5740, transparent)'
              : '#ff5740',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: `megaBurst 0.8s ${p.delay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
            ['--dx' as string]: `${p.dx}px`,
            ['--dy' as string]: `${p.dy}px`,
            opacity: 0.9,
            filter: p.isLarge ? 'blur(1px)' : 'none',
          }}
        />
      ))}
    </div>
  );
};

export const MatchCard: React.FC<MatchCardProps> = ({
  quote,
  side,
  onPick,
  selected,
  disabled,
}) => {
  const [hover, setHover] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const cardRef = useRef<HTMLDivElement>(null);

  const isWinner = selected === side;
  const isLoser = selected !== null && selected !== side;

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current || disabled) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, [disabled]);

  const tiltX = hover && !disabled ? (mousePos.y - 0.5) * -12 : 0;
  const tiltY = hover && !disabled ? (mousePos.x - 0.5) * 12 : 0;
  const shineX = mousePos.x * 100;
  const shineY = mousePos.y * 100;

  const label = side === 'left' ? 'POSITION A' : 'POSITION B';
  const keyHint = side === 'left' ? '[ 1 ] or ←' : '[ 2 ] or →';

  let cardTransform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
  let cardOpacity: number | undefined = undefined;
  let cardBoxShadow = hover
    ? '0 8px 24px rgba(0,0,0,0.1)'
    : '0 2px 8px rgba(0,0,0,0.06)';
  let borderStyle: React.CSSProperties = { border: '1px solid #e8e2d9' };

  if (isWinner) {
    cardTransform = 'perspective(1000px) scale(1.06) translateY(-8px)';
    cardBoxShadow = '0 12px 40px rgba(255, 87, 64, 0.4), 0 4px 16px rgba(0,0,0,0.08)';
    borderStyle = { border: '2px solid #ff5740' };
  } else if (isLoser) {
    cardTransform = 'perspective(1000px) scale(0.7) rotateY(20deg)';
    cardOpacity = 0;
  }

  return (
    <div
      className="matchup-card-wrapper"
      style={{ flex: 1, minWidth: 0, perspective: '1000px', position: 'relative' }}
    >
      {/* CHOSEN badge */}
      {isWinner && (
        <div style={{
          position: 'absolute',
          top: -32,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
          animation: 'slamDown 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards',
          backgroundColor: '#ff5740',
          color: 'white',
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 800,
          fontSize: '0.6875rem',
          letterSpacing: '0.12em',
          padding: '3px 10px',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
        }}>
          CHOSEN
        </div>
      )}

      <div
        ref={cardRef}
        onClick={() => !disabled && !selected && onPick(side)}
        onMouseEnter={() => !disabled && setHover(true)}
        onMouseLeave={() => { setHover(false); setMousePos({ x: 0.5, y: 0.5 }); }}
        onMouseMove={handleMouseMove}
        style={{
          position: 'relative',
          backgroundColor: '#fffefb',
          borderRadius: '18px',
          ...borderStyle,
          padding: '1.25rem 1rem',
          cursor: disabled || selected ? 'default' : 'pointer',
          pointerEvents: disabled ? 'none' : undefined,
          transform: cardTransform,
          opacity: cardOpacity,
          transition: isLoser
            ? 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
            : isWinner
            ? 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease, opacity 0.35s ease'
            : 'transform 0.15s ease, box-shadow 0.15s ease',
          boxShadow: cardBoxShadow,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          userSelect: 'none',
          overflow: 'hidden',
        }}
      >
        {/* Holographic shine overlay */}
        {hover && !disabled && (
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '18px',
            background: `radial-gradient(circle at ${shineX}% ${shineY}%, rgba(0, 101, 124, 0.08) 0%, transparent 60%)`,
            pointerEvents: 'none',
            zIndex: 1,
          }} />
        )}

        {/* Position label */}
        <div style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 600,
          fontSize: '0.625rem',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: hover && !disabled ? '#00657c' : '#94a3b8',
          transition: 'color 0.15s ease',
          position: 'relative',
          zIndex: 2,
        }}>
          {label}
        </div>

        {/* Quote text */}
        <div style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 400,
          fontSize: '0.9375rem',
          lineHeight: 1.75,
          color: '#1a1a2e',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          flex: 1,
          position: 'relative',
          zIndex: 2,
        }}>
          {quote.text}
        </div>

        {/* Keyboard hint */}
        <div style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 500,
          fontSize: '0.625rem',
          color: '#d4cdc3',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2,
        }}>
          {keyHint}
        </div>

        {/* Winner particles */}
        <MegaParticles active={isWinner} />
      </div>
    </div>
  );
};
