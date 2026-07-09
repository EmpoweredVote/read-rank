import { describe, it, expect } from 'vitest';
import { routeFromClassification } from '../localitySearch';

const counties = { '06037': 'Los Angeles County', '06059': 'Orange County' };

describe('routeFromClassification', () => {
  it('address → located ballot', () => {
    expect(routeFromClassification({ kind: 'address' }, counties, 'anything'))
      .toEqual({ kind: 'address' });
  });
  it('state → browse that state', () => {
    expect(routeFromClassification({ kind: 'state', stateAbbrev: 'CA' }, counties, 'California'))
      .toEqual({ kind: 'browse-state', state: 'CA' });
  });
  it('county name → browse that county GEOID', () => {
    expect(routeFromClassification(
      { kind: 'county', stateAbbrev: 'CA', countyName: 'Los Angeles County' }, counties, 'Los Angeles',
    )).toEqual({ kind: 'browse-county', geoid: '06037', state: 'CA' });
  });
  it('city name resolves to its county when known', () => {
    expect(routeFromClassification(
      { kind: 'city', stateAbbrev: 'CA', countyName: 'Orange County', cityName: 'Irvine' }, counties, 'Irvine',
    )).toEqual({ kind: 'browse-county', geoid: '06059', state: 'CA' });
  });
  it('unresolvable place → falls back to address', () => {
    expect(routeFromClassification({ kind: 'unknown' }, counties, 'zzz'))
      .toEqual({ kind: 'address' });
  });
});
