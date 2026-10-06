import { describe, it, expect } from 'vitest';
import { routeFromQuery, resolveQueryRoute } from '../localitySearch';

const counties = { '06037': 'Los Angeles County', '06059': 'Orange County' };
const multiState = {
  '53061': 'Snohomish County',
  '06037': 'Los Angeles County',
  '17999': 'Washington County',
  '49053': 'Washington County',
};

describe('routeFromQuery', () => {
  it('street address → address', () => {
    expect(routeFromQuery('123 Main St, Springfield', counties)).toEqual({ kind: 'address' });
  });
  it('ZIP code → address', () => {
    expect(routeFromQuery('90012', counties)).toEqual({ kind: 'address' });
  });
  it('full state name → browse that state', () => {
    expect(routeFromQuery('California', counties)).toEqual({ kind: 'browse-state', state: 'CA' });
  });
  it('state abbreviation, any case → browse that state', () => {
    expect(routeFromQuery('tx', counties)).toEqual({ kind: 'browse-state', state: 'TX' });
  });
  it('"Washington" → Washington state', () => {
    expect(routeFromQuery('Washington', counties)).toEqual({ kind: 'browse-state', state: 'WA' });
  });
  it('DC is not browsable → address', () => {
    expect(routeFromQuery('DC', counties)).toEqual({ kind: 'address' });
    expect(routeFromQuery('Washington, D.C.', counties)).toEqual({ kind: 'address' });
  });
  it('county name with "County" → browse that county', () => {
    expect(routeFromQuery('Los Angeles County', counties))
      .toEqual({ kind: 'browse-county', geoid: '06037', state: 'CA' });
  });
  it('county name without "County" → browse that county', () => {
    expect(routeFromQuery('Los Angeles', counties))
      .toEqual({ kind: 'browse-county', geoid: '06037', state: 'CA' });
  });
  it('state qualifier scopes a repeated county name', () => {
    expect(routeFromQuery('Washington County, UT', multiState))
      .toEqual({ kind: 'browse-county', geoid: '49053', state: 'UT' });
  });
  it('repeated county name with no qualifier is ambiguous → address', () => {
    expect(routeFromQuery('Washington County', multiState)).toEqual({ kind: 'address' });
  });
  it('unknown county with a state qualifier → browse that state', () => {
    expect(routeFromQuery('Nowhere County, CA', counties))
      .toEqual({ kind: 'browse-state', state: 'CA' });
  });
  it('unresolvable text → address', () => {
    expect(routeFromQuery('zzz', counties)).toEqual({ kind: 'address' });
  });
  it('empty → address', () => {
    expect(routeFromQuery('', counties)).toEqual({ kind: 'address' });
    expect(routeFromQuery('   ', counties)).toEqual({ kind: 'address' });
  });
});

describe('resolveQueryRoute', () => {
  it('resolves to the same route as routeFromQuery', async () => {
    await expect(resolveQueryRoute('Los Angeles', counties))
      .resolves.toEqual({ kind: 'browse-county', geoid: '06037', state: 'CA' });
    await expect(resolveQueryRoute('zzz', counties)).resolves.toEqual({ kind: 'address' });
  });
});
