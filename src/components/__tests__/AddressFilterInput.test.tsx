import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QueryRoute } from '../../lib/localitySearch';

// ---- Mocks ----------------------------------------------------------------

// Store: expose a controllable slice with spy actions.
const setBrowseTarget = vi.fn();
const setLocationFilter = vi.fn();
const clearLocationFilter = vi.fn();
const storeSlice = {
  locationFilter: null as unknown,
  setLocationFilter,
  clearLocationFilter,
  counties: { '06037': 'Los Angeles County' } as Record<string, string>,
  setBrowseTarget,
};
vi.mock('../../store/useReadRankStore', () => ({
  useReadRankStore: () => storeSlice,
}));

// Smart-search classifier: mocked so we can drive the route per test.
const resolveQueryRoute =
  vi.fn<(q: string, counties: Record<string, string>) => Promise<QueryRoute>>();
vi.mock('../../lib/localitySearch', () => ({
  resolveQueryRoute: (...args: [string, Record<string, string>]) => resolveQueryRoute(...args),
}));

// Address search — asserts we took the address path.
const searchPoliticians = vi.fn().mockResolvedValue({ data: [], county: null });
vi.mock('../../data/api', () => ({
  searchPoliticians: (...args: unknown[]) => searchPoliticians(...args),
}));

// Neutralize the environment-heavy dependencies.
vi.mock('../../hooks/useGooglePlacesAutocomplete', () => ({ default: () => {} }));
vi.mock('../../hooks/useAuthState', () => ({
  useAuthState: () => ({ isLoggedIn: false, userId: null, logout: vi.fn() }),
}));
vi.mock('@empoweredvote/ev-ui', () => ({
  evContext: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    getAuthedSlice: vi.fn().mockResolvedValue(null),
    setAuthedSlice: vi.fn().mockResolvedValue(undefined),
  },
  useEvContextPromotion: () => ({
    shouldPrompt: false, payload: null, promote: vi.fn(),
    dismiss: vi.fn(), status: 'idle', error: null,
  }),
}));

import { AddressFilterInput } from '../AddressFilterInput';

beforeEach(() => {
  vi.clearAllMocks();
  storeSlice.locationFilter = null;
});

describe('AddressFilterInput smart-search routing', () => {
  it('routes a place-name classified as browse-state into setBrowseTarget', async () => {
    resolveQueryRoute.mockResolvedValue({ kind: 'browse-state', state: 'CA' });
    render(<AddressFilterInput />);

    await userEvent.type(screen.getByRole('textbox'), 'California');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(setBrowseTarget).toHaveBeenCalledWith({ state: 'CA', geoid: null });
    });
    // Browse routing must not fall through to the address search.
    expect(searchPoliticians).not.toHaveBeenCalled();
    expect(setLocationFilter).not.toHaveBeenCalled();
  });

  it('routes a browse-county classification into setBrowseTarget with the geoid', async () => {
    resolveQueryRoute.mockResolvedValue({ kind: 'browse-county', state: 'CA', geoid: '06037' });
    render(<AddressFilterInput />);

    await userEvent.type(screen.getByRole('textbox'), 'Los Angeles County');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(setBrowseTarget).toHaveBeenCalledWith({ state: 'CA', geoid: '06037' });
    });
    expect(searchPoliticians).not.toHaveBeenCalled();
  });

  it('falls through to the address path when classified as address', async () => {
    resolveQueryRoute.mockResolvedValue({ kind: 'address' });
    render(<AddressFilterInput />);

    await userEvent.type(screen.getByRole('textbox'), '123 Main St, Springfield');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(searchPoliticians).toHaveBeenCalledWith('123 Main St, Springfield');
    });
    expect(setBrowseTarget).not.toHaveBeenCalled();
  });
});
