import { describe, it, expect, vi, beforeEach } from 'vitest';
import { routeFromQuery, resolveQueryRoute, routeFromLocalities } from '../localitySearch';
import { fetchLocalities } from '../../data/api';

vi.mock('../../data/api', () => ({ fetchLocalities: vi.fn() }));
const mockLookup = vi.mocked(fetchLocalities);
beforeEach(() => {
  mockLookup.mockReset();
  mockLookup.mockResolvedValue([]);
});

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
  // Changed: the state fallback for a county miss now happens in routeFromLocalities,
  // after the city lookup. The pure local matcher no longer guesses a state.
  it('unknown place with a state qualifier → address (state fallback is in routeFromLocalities)', () => {
    expect(routeFromQuery('Nowhere County, CA', counties)).toEqual({ kind: 'address' });
  });
  it('unresolvable text → address', () => {
    expect(routeFromQuery('zzz', counties)).toEqual({ kind: 'address' });
  });
  it('empty → address', () => {
    expect(routeFromQuery('', counties)).toEqual({ kind: 'address' });
    expect(routeFromQuery('   ', counties)).toEqual({ kind: 'address' });
  });
});

const loc = (name: string, state: string, placeGeoid: string, countyGeoid: string) =>
  ({ name, state, placeGeoid, countyGeoid });

describe('routeFromLocalities', () => {
  it('none, no qualifier → address', () => {
    expect(routeFromLocalities([], counties, null)).toEqual({ kind: 'address' });
  });
  it('none, qualifier → browse-state', () => {
    expect(routeFromLocalities([], counties, 'IN')).toEqual({ kind: 'browse-state', state: 'IN' });
  });
  it('one locality, county in index → browse-county', () => {
    expect(routeFromLocalities([loc('Irvine', 'ca', '0636770', '06059')], counties, null))
      .toEqual({ kind: 'browse-county', geoid: '06059', state: 'CA' });
  });
  it('one locality, county not in index → browse-state', () => {
    expect(routeFromLocalities([loc('Irvine', 'CA', '0636770', '06999')], counties, null))
      .toEqual({ kind: 'browse-state', state: 'CA' });
  });
  it('two localities, same state, different counties → browse-state', () => {
    expect(routeFromLocalities([
      loc('Springfield', 'CA', '1', '06037'), loc('Springfield', 'CA', '2', '06059'),
    ], counties, null)).toEqual({ kind: 'browse-state', state: 'CA' });
  });
  it('two localities, different states → address', () => {
    expect(routeFromLocalities([
      loc('Springfield', 'CA', '1', '06037'), loc('Springfield', 'IL', '2', '17167'),
    ], counties, null)).toEqual({ kind: 'address' });
  });
});

describe('resolveQueryRoute', () => {
  it('resolves local matches without a lookup', async () => {
    await expect(resolveQueryRoute('Los Angeles', counties))
      .resolves.toEqual({ kind: 'browse-county', geoid: '06037', state: 'CA' });
    await expect(resolveQueryRoute('Los Angeles County', counties))
      .resolves.toEqual({ kind: 'browse-county', geoid: '06037', state: 'CA' });
    await expect(resolveQueryRoute('California', counties))
      .resolves.toEqual({ kind: 'browse-state', state: 'CA' });
    await expect(resolveQueryRoute('123 Main St', counties)).resolves.toEqual({ kind: 'address' });
    await expect(resolveQueryRoute('', counties)).resolves.toEqual({ kind: 'address' });
    await expect(resolveQueryRoute('Washington County', multiState)).resolves.toEqual({ kind: 'address' });
    expect(mockLookup).not.toHaveBeenCalled();
  });
  it('city name → browse-county via the lookup', async () => {
    mockLookup.mockResolvedValue([loc('Irvine', 'CA', '0636770', '06059')]);
    await expect(resolveQueryRoute('Irvine', counties))
      .resolves.toEqual({ kind: 'browse-county', geoid: '06059', state: 'CA' });
    expect(mockLookup).toHaveBeenCalledWith('Irvine', null);
  });
  it('passes the qualifier state to the lookup', async () => {
    mockLookup.mockResolvedValue([loc('Irvine', 'CA', '0636770', '06059')]);
    await resolveQueryRoute('Irvine, California', counties);
    expect(mockLookup).toHaveBeenCalledWith('Irvine', 'CA');
  });
  it('lookup returns [] → address', async () => {
    await expect(resolveQueryRoute('zzz', counties)).resolves.toEqual({ kind: 'address' });
  });
  it('lookup rejects → address', async () => {
    mockLookup.mockRejectedValue(new Error('boom'));
    await expect(resolveQueryRoute('Irvine', counties)).resolves.toEqual({ kind: 'address' });
  });
  it('"Bloomington, IN" with empty lookup → browse-state IN', async () => {
    await expect(resolveQueryRoute('Bloomington, IN', counties))
      .resolves.toEqual({ kind: 'browse-state', state: 'IN' });
  });
});
