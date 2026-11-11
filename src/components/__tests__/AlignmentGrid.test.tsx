import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AlignmentGrid } from '../AlignmentGrid';

const originalWidth = window.innerWidth;
afterEach(() => { Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth }); });

const setWidth = (w: number) => Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });

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

  it('marks #1, other ranks, agreed, disagreed, and leaves a spot blank where there is no quote', () => {
    render(
      <AlignmentGrid
        topics={[{ key: 'a', title: 'A' }, { key: 'b', title: 'B' }, { key: 'c', title: 'C' }, { key: 'd', title: 'D' }, { key: 'e', title: 'E' }]}
        rows={[{
          candidateId: 'x', name: 'Ana',
          cells: [{ kind: 'rank', rank: 1 }, { kind: 'rank', rank: 2 }, { kind: 'agreed' }, { kind: 'disagreed' }, null],
        }]}
      />
    );
    const row = screen.getByRole('row', { name: /ana/i });
    expect(within(row).getByRole('img', { name: 'Your number 1 pick' })).toHaveTextContent('1');
    expect(within(row).getByRole('img', { name: 'Agreed, ranked 2' })).toHaveTextContent('2');
    expect(within(row).getByRole('img', { name: 'Agreed' })).toBeInTheDocument();
    expect(within(row).getByRole('img', { name: 'Disagreed' })).toBeInTheDocument();
    expect(within(row).getByRole('img', { name: 'No quote' })).toHaveTextContent('–');
  });

  it('labels each cell with its topic so the stacked tiles can show it', () => {
    render(
      <AlignmentGrid topics={[{ key: 'h', title: 'Housing' }]}
        rows={[{ candidateId: 'x', name: 'Ana', cells: [{ kind: 'disagreed' }] }]} />
    );
    expect(screen.getByRole('cell', { name: 'Disagreed' })).toHaveAttribute('data-topic', 'Housing');
  });

  it('stacks on phone widths', () => {
    setWidth(390);
    render(
      <AlignmentGrid topics={[{ key: 'h', title: 'Housing' }]}
        rows={[{ candidateId: 'x', name: 'Ana', cells: [null] }]} />
    );
    expect(screen.getByRole('table')).toHaveClass('glance-table--stacked');
  });

  it('stays a table on wide screens when it fits', () => {
    setWidth(1400);
    render(
      <AlignmentGrid topics={[{ key: 'h', title: 'Housing' }]}
        rows={[{ candidateId: 'x', name: 'Ana', cells: [null] }]} />
    );
    expect(screen.getByRole('table')).not.toHaveClass('glance-table--stacked');
  });
});
