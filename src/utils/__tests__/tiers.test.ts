import { describe, it, expect } from 'vitest';
import { tierForIndex, TIER_META, tierAnnouncement } from '../tiers';

describe('tier model', () => {
  it('maps agreed positions to tiers (1/1/1/unlimited)', () => {
    expect(tierForIndex(0)).toBe('diamond');
    expect(tierForIndex(1)).toBe('gold');
    expect(tierForIndex(2)).toBe('silver');
    expect(tierForIndex(3)).toBe('bronze');
    expect(tierForIndex(11)).toBe('bronze');
  });

  it('carries labels and names for every tier', () => {
    expect(TIER_META.diamond).toEqual({ tier: 'diamond', label: '1st choice', name: 'Diamond' });
    expect(TIER_META.gold).toEqual({ tier: 'gold', label: '2nd choice', name: 'Gold' });
    expect(TIER_META.silver).toEqual({ tier: 'silver', label: '3rd choice', name: 'Silver' });
    expect(TIER_META.bronze).toEqual({ tier: 'bronze', label: 'Agreed', name: 'Bronze' });
    expect(TIER_META.iron).toEqual({ tier: 'iron', label: 'Disagreed', name: 'Iron' });
  });

  it('builds tier announcements per spec', () => {
    expect(tierAnnouncement(0, 5)).toBe('1st choice, Diamond');
    expect(tierAnnouncement(1, 5)).toBe('2nd choice, Gold');
    expect(tierAnnouncement(2, 5)).toBe('3rd choice, Silver');
    expect(tierAnnouncement(4, 5)).toBe('position 5 of 5, Bronze');
  });
});
