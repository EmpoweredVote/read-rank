import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TierIcon } from '../TierIcon';
import type { Tier } from '../../utils/tiers';

const tiers: Tier[] = ['diamond', 'gold', 'silver', 'bronze', 'disagreed'];

describe('TierIcon', () => {
  it.each(tiers)('renders a colored tile with decorative icon for %s', (tier) => {
    const { container } = render(<TierIcon tier={tier} />);
    const tile = container.firstElementChild as HTMLElement;
    expect(tile).toHaveAttribute('aria-hidden', 'true');
    expect(tile).toHaveClass(`tier-tile-${tier}`);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveClass(`tier-icon-${tier}`);
  });

  it('renders no gleam sweep by default', () => {
    const { container } = render(<TierIcon tier="diamond" />);
    expect(container.querySelector('.tier-gleam-sweep')).toBeNull();
  });

  it('renders a gleam sweep with the given delay when gleam is set', () => {
    const { container } = render(<TierIcon tier="diamond" gleam gleamDelayMs={240} />);
    const sweep = container.querySelector('.tier-gleam-sweep') as HTMLElement;
    expect(sweep).not.toBeNull();
    expect(sweep).toHaveAttribute('aria-hidden', 'true');
    expect(sweep.style.animationDelay).toBe('240ms');
  });
});
