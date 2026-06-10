/**
 * The tier frame model (REDESIGN_SPEC §3.4). Position in the agreed pile IS
 * the tier: exactly one Diamond/Gold/Silver, everything else Bronze.
 * Iron is not positional — it marks disagreed quotes.
 */
export type Tier = 'diamond' | 'gold' | 'silver' | 'bronze' | 'iron';

export interface TierMeta {
  tier: Tier;
  /** Short label rendered on rows and slots. */
  label: string;
  /** Proper tier name, used in announcements and titles. */
  name: string;
}

export const TIER_META: Record<Tier, TierMeta> = {
  diamond: { tier: 'diamond', label: '1st choice', name: 'Diamond' },
  gold: { tier: 'gold', label: '2nd choice', name: 'Gold' },
  silver: { tier: 'silver', label: '3rd choice', name: 'Silver' },
  bronze: { tier: 'bronze', label: 'Agreed', name: 'Bronze' },
  iron: { tier: 'iron', label: 'Disagreed', name: 'Iron' },
};

/** Tier for a 0-based position in the agreed pile. */
export function tierForIndex(index: number): Tier {
  return index === 0 ? 'diamond' : index === 1 ? 'gold' : index === 2 ? 'silver' : 'bronze';
}

/** Screen-reader announcement for landing at a position (spec §3.2). */
export function tierAnnouncement(index: number, total: number): string {
  const meta = TIER_META[tierForIndex(index)];
  if (meta.tier === 'bronze') return `position ${index + 1} of ${total}, ${meta.name}`;
  return `${meta.label}, ${meta.name}`;
}
