import React from 'react';

export interface RankNumberProps {
  rank: number;
  /** Diameter in px. */
  size?: number;
}

/** Teal filled rank chip. Same visual weight for every rank (spec §2). */
export const RankNumber: React.FC<RankNumberProps> = ({ rank, size = 24 }) => (
  <span
    className="rank-number"
    style={{ width: size, height: size, fontSize: Math.round(size * 0.52) }}
    aria-hidden="true"
  >
    {rank}
  </span>
);
