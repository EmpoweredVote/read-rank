import { describe, it, expect } from 'vitest';
import { getStateName } from '../stateNames';

describe('getStateName', () => {
  it('returns the full name for a known abbreviation', () => {
    expect(getStateName('IN')).toBe('Indiana');
    expect(getStateName('CA')).toBe('California');
    expect(getStateName('DC')).toBe('Washington, D.C.');
  });

  it('is case-insensitive', () => {
    expect(getStateName('in')).toBe('Indiana');
    expect(getStateName('Ca')).toBe('California');
  });

  it('returns null for an unknown abbreviation', () => {
    expect(getStateName('XX')).toBeNull();
  });

  it('returns null for null or undefined', () => {
    expect(getStateName(null)).toBeNull();
    expect(getStateName(undefined)).toBeNull();
  });
});
