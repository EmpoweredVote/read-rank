import { describe, it, expect, beforeEach } from 'vitest';
import { useReadRankStore } from '../useReadRankStore';

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
});

describe('first-agree coaching flag', () => {
  it('defaults to uncoached', () => {
    expect(useReadRankStore.getState().firstAgreeCoached).toBe(false);
  });

  it('flips once and stays flipped', () => {
    useReadRankStore.getState().completeFirstAgreeCoach();
    expect(useReadRankStore.getState().firstAgreeCoached).toBe(true);
    useReadRankStore.getState().completeFirstAgreeCoach();
    expect(useReadRankStore.getState().firstAgreeCoached).toBe(true);
  });
});
