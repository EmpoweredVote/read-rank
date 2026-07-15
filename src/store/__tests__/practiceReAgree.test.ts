import { describe, it, expect, beforeEach } from 'vitest';
import { useReadRankStore } from '../useReadRankStore';
import { PRACTICE_QUOTES } from '../../data/practiceData';

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
});

describe('reAgreePractice', () => {
  it('moves a disagreed practice quote back into agreed', () => {
    const s = useReadRankStore.getState();
    s.startPractice(PRACTICE_QUOTES);
    const q = PRACTICE_QUOTES[0];
    s.disagreePractice(q);
    expect(useReadRankStore.getState().practiceProgress!.disagreed.map((x) => x.id)).toContain(q.id);

    useReadRankStore.getState().reAgreePractice(q);

    const p = useReadRankStore.getState().practiceProgress!;
    expect(p.agreed.map((x) => x.id)).toContain(q.id);
    expect(p.disagreed.map((x) => x.id)).not.toContain(q.id);
  });

  it('is a no-op if the quote is already agreed', () => {
    const s = useReadRankStore.getState();
    s.startPractice(PRACTICE_QUOTES);
    const q = PRACTICE_QUOTES[0];
    s.agreePractice(q);
    useReadRankStore.getState().reAgreePractice(q);
    const p = useReadRankStore.getState().practiceProgress!;
    expect(p.agreed.filter((x) => x.id === q.id)).toHaveLength(1);
  });
});
