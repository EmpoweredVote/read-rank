import { describe, it, expect } from 'vitest';
import { getStateName, getStateAbbrevFromName, getStateAbbrevFromFips } from '../stateNames';

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

describe('getStateAbbrevFromName', () => {
  it('matches full names and abbreviations, case-insensitive', () => {
    expect(getStateAbbrevFromName('California')).toBe('CA');
    expect(getStateAbbrevFromName('new york')).toBe('NY');
    expect(getStateAbbrevFromName('tx')).toBe('TX');
  });
  it('returns null for DC and unknowns', () => {
    expect(getStateAbbrevFromName('DC')).toBeNull();
    expect(getStateAbbrevFromName('Washington, D.C.')).toBeNull();
    expect(getStateAbbrevFromName('zzz')).toBeNull();
  });
});

describe('getStateAbbrevFromFips', () => {
  it('reverses STATE_FIPS', () => {
    expect(getStateAbbrevFromFips('06')).toBe('CA');
    expect(getStateAbbrevFromFips('49')).toBe('UT');
    expect(getStateAbbrevFromFips('99')).toBeNull();
  });
});
