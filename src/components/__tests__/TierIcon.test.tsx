import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TierIcon } from '../TierIcon';
import type { Tier } from '../../utils/tiers';

const tiers: Tier[] = ['diamond', 'gold', 'silver', 'bronze', 'disagreed'];

describe('TierIcon', () => {
  it.each(tiers)('renders a decorative svg for %s', (tier) => {
    const { container } = render(<TierIcon tier={tier} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass(`tier-icon-${tier}`);
  });
});
