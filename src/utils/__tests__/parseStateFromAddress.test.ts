import { describe, it, expect } from 'vitest';
import { parseStateFromAddress } from '../parseStateFromAddress';

describe('parseStateFromAddress', () => {
  it('reads the state before a 5-digit zip', () => {
    expect(parseStateFromAddress('877 W 1050 N, OREM, UT, 84057')).toBe('UT');
  });

  it('reads the state before a zip+4', () => {
    expect(parseStateFromAddress('123 Main St, Springfield, IL 62704-1234')).toBe('IL');
  });

  it('reads a bare two-letter segment when no zip is present', () => {
    expect(parseStateFromAddress('Somewhere, CA')).toBe('CA');
  });

  it('returns null for empty input', () => {
    expect(parseStateFromAddress('')).toBeNull();
  });

  it('returns null when no state token is found', () => {
    expect(parseStateFromAddress('just a street name')).toBeNull();
  });
});
