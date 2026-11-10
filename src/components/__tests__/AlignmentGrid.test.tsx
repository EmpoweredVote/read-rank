import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlignmentGrid } from '../AlignmentGrid';

describe('AlignmentGrid', () => {
  it('gives each topic header a title attribute with the full topic title', () => {
    render(
      <AlignmentGrid
        topics={[{ key: 'k', title: 'Cannabis Legalization' }]}
        rows={[{ candidateId: 'c', name: 'Ana', cells: [{ kind: 'rank', rank: 1 }] }]}
      />
    );
    expect(screen.getByRole('columnheader', { name: 'Cannabis Legalization' })).toHaveAttribute('title', 'Cannabis Legalization');
  });
});
