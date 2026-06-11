// src/components/motif/__tests__/DotField.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DotField } from '../DotField';

describe('DotField', () => {
  it('renders a non-empty field of dots for each arrangement', () => {
    for (const a of ['full', 'cluster', 'point'] as const) {
      const { container, unmount } = render(<DotField arrangement={a} />);
      expect(container.querySelectorAll('circle').length).toBeGreaterThan(3);
      unmount();
    }
  });
});
