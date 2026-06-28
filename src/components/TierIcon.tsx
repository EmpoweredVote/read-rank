import React from 'react';
import type { Tier } from '../utils/tiers';

export interface TierIconProps {
  tier: Tier;
  size?: number;
  /** Play a one-time metallic sheen sweep across the tile (reveal grid only). */
  gleam?: boolean;
  /** ms to delay the gleam sweep so it lands as the medal settles. */
  gleamDelayMs?: number;
}

/**
 * Decorative tier glyphs (REDESIGN_SPEC §3.4): a minted metallic tile with a
 * white icon inside. The per-tier gradient + inset highlight live in CSS
 * (`.tier-tile-${tier}`). Always paired with a visible text label — the icon
 * alone never carries the tier. Optionally plays a one-time gleam sweep.
 */
export const TierIcon: React.FC<TierIconProps> = ({ tier, size = 14, gleam = false, gleamDelayMs = 0 }) => {
  const radius = Math.round(size * 0.3);
  const iconSize = Math.round(size * 0.7);

  const common = {
    width: iconSize,
    height: iconSize,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'white',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: `tier-icon tier-icon-${tier}`,
  };

  const icon = (() => {
    switch (tier) {
      case 'diamond':
        return (
          <svg {...common}>
            <path d="M7 3h10l4 6-9 12L3 9l4-6z" />
            <path d="M3 9h18M9.5 3 12 9l2.5-6M12 21 9.5 9M12 21l2.5-12" strokeWidth="1.25" />
          </svg>
        );
      case 'gold':
        return (
          <svg {...common}>
            <circle cx="12" cy="14" r="7" />
            <path d="M8.5 2.5 11 7.5M15.5 2.5 13 7.5" />
            <text x="12" y="17" textAnchor="middle" fontSize="9" fontWeight="800" fill="white" stroke="none">2</text>
          </svg>
        );
      case 'silver':
        return (
          <svg {...common}>
            <circle cx="12" cy="14" r="7" />
            <path d="M8.5 2.5 11 7.5M15.5 2.5 13 7.5" />
            <text x="12" y="17" textAnchor="middle" fontSize="9" fontWeight="800" fill="white" stroke="none">3</text>
          </svg>
        );
      case 'bronze':
        return (
          <svg {...common}>
            <circle cx="12" cy="12" r="9" />
            <path d="M8.5 12.5l2.5 2.5 4.5-5.5" />
          </svg>
        );
      case 'disagreed':
        return (
          <svg {...common}>
            <circle cx="12" cy="12" r="9" />
            <path d="M5.6 5.6l12.8 12.8" />
          </svg>
        );
    }
  })();

  return (
    <span
      aria-hidden="true"
      className={`tier-tile tier-tile-${tier}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
      }}
    >
      {icon}
      {gleam && (
        <span className="tier-gleam-sweep" aria-hidden="true" style={{ animationDelay: `${gleamDelayMs}ms` }} />
      )}
    </span>
  );
};
