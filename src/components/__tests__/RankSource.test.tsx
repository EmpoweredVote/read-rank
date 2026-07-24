import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { RankSourceProvider, useRankSource, useRaceRankSource, type RankSource } from '../RankSource';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const src: RankSource = { agreed: [], disagreed: [], reorder: () => {}, toggleTie: () => {}, reAgree: () => {}, setRankedCount: () => {} };

describe('useRankSource', () => {
  it('throws when used without a provider', () => {
    expect(() => renderHook(() => useRankSource())).toThrow(/RankSource/);
  });

  it('returns the provided source', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RankSourceProvider value={src}>{children}</RankSourceProvider>
    );
    const { result } = renderHook(() => useRankSource(), { wrapper });
    expect(result.current).toBe(src);
  });
});

const racePayload: RacePayload = {
  raceId: 'race-src',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'housing',
      title: 'Housing',
      question: 'How to fix housing?',
      quotes: [
        { id: 'q1', text: 'One.', candidateToken: 'a', topicKey: 'housing' },
        { id: 'q2', text: 'Two.', candidateToken: 'b', topicKey: 'housing' },
      ],
    },
  ],
};

describe('useRaceRankSource', () => {
  beforeEach(() => {
    window.localStorage?.clear();
    useReadRankStore.getState().reset();
    useReadRankStore.getState().selectRace(racePayload);
  });

  it('surfaces the current topic agreed/disagreed and updates on mutation', () => {
    const { result } = renderHook(() => useRaceRankSource());
    expect(result.current.agreed).toEqual([]);
    act(() => useReadRankStore.getState().agree(racePayload.topics[0].quotes[0]));
    expect(result.current.agreed.map((q) => q.id)).toEqual(['q1']);
    act(() => useReadRankStore.getState().disagree(racePayload.topics[0].quotes[1]));
    expect(result.current.disagreed.map((q) => q.id)).toEqual(['q2']);
  });

  it('returns a stable object identity when nothing relevant changed', () => {
    const { result, rerender } = renderHook(() => useRaceRankSource());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
    act(() => useReadRankStore.getState().agree(racePayload.topics[0].quotes[0]));
    expect(result.current).not.toBe(first);
  });
});
