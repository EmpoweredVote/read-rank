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
  browseTarget: null as unknown,
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
const autocompleteCalls: Array<{ el: unknown; attachKey: unknown }> = [];
vi.mock('../../hooks/useGooglePlacesAutocomplete', () => ({
  default: (ref: { current: unknown }, opts: { attachKey?: unknown }) => {
    autocompleteCalls.push({ el: ref.current, attachKey: opts.attachKey });
  },
}));
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
import { evContext } from '@empoweredvote/ev-ui';

beforeEach(() => {
  vi.clearAllMocks();
  storeSlice.locationFilter = null;
  storeSlice.browseTarget = null;
  autocompleteCalls.length = 0;
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

describe('AddressFilterInput known-address line', () => {
  const located = {
    address: '100 W Kirkwood Ave, Bloomington, IN 47404',
    politicianIds: ['p1'], state: 'IN', county: null, countyName: null, jurisdiction: null,
  };

  it('shows "Races for" with the address and a Change button, and no textbox', () => {
    storeSlice.locationFilter = located;
    render(<AddressFilterInput />);
    expect(screen.getByText(/races for/i)).toHaveTextContent('100 W Kirkwood Ave');
    expect(screen.getByRole('button', { name: 'Change address' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('Change opens a focused search box with Cancel and Clear address', async () => {
    storeSlice.locationFilter = located;
    render(<AddressFilterInput />);
    await userEvent.click(screen.getByRole('button', { name: 'Change address' }));
    expect(await screen.findByRole('textbox')).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear address' })).toBeInTheDocument();
  });

  it('Cancel and Escape return to the line without changing the filter', async () => {
    storeSlice.locationFilter = located;
    render(<AddressFilterInput />);
    await userEvent.click(screen.getByRole('button', { name: 'Change address' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('button', { name: 'Change address' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Change address' }));
    await screen.findByRole('textbox');
    await userEvent.keyboard('{Escape}');
    expect(await screen.findByRole('button', { name: 'Change address' })).toBeInTheDocument();
    expect(setLocationFilter).not.toHaveBeenCalled();
    expect(clearLocationFilter).not.toHaveBeenCalled();
  });

  it('returns focus to the Change button after Cancel and after Escape', async () => {
    storeSlice.locationFilter = located;
    render(<AddressFilterInput />);
    await userEvent.click(screen.getByRole('button', { name: 'Change address' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(async () => expect(await screen.findByRole('button', { name: 'Change address' })).toHaveFocus());

    await userEvent.click(screen.getByRole('button', { name: 'Change address' }));
    await screen.findByRole('textbox');
    await userEvent.keyboard('{Escape}');
    await waitFor(async () => expect(await screen.findByRole('button', { name: 'Change address' })).toHaveFocus());
  });

  it('says "Your address" instead of "Races for" while a browse target is set', () => {
    storeSlice.locationFilter = located;
    storeSlice.browseTarget = { state: 'CA', geoid: null };
    render(<AddressFilterInput />);
    expect(screen.getByText(/your address/i)).toHaveTextContent('100 W Kirkwood Ave');
    expect(screen.queryByText(/races for/i)).not.toBeInTheDocument();
  });

  it('labels the search input "Street address"', () => {
    storeSlice.locationFilter = null;
    render(<AddressFilterInput />);
    expect(screen.getByRole('textbox', { name: 'Street address' })).toBeInTheDocument();
  });

  it('Clear address clears the location filter', async () => {
    storeSlice.locationFilter = located;
    render(<AddressFilterInput />);
    await userEvent.click(screen.getByRole('button', { name: 'Change address' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Clear address' }));
    expect(clearLocationFilter).toHaveBeenCalledTimes(1);
  });

  it('a successful new address search closes the edit state', async () => {
    storeSlice.locationFilter = located;
    resolveQueryRoute.mockResolvedValue({ kind: 'address' });
    searchPoliticians.mockResolvedValueOnce({ data: [{ id: 'p2' }], county: null });
    render(<AddressFilterInput />);
    await userEvent.click(screen.getByRole('button', { name: 'Change address' }));
    await userEvent.type(await screen.findByRole('textbox'), '1 Main St, Salt Lake City, UT');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => expect(setLocationFilter).toHaveBeenCalled());
    expect(await screen.findByRole('button', { name: 'Change address' })).toBeInTheDocument();
  });

  it('with no address, shows the search box and no "Races for" line', () => {
    storeSlice.locationFilter = null;
    render(<AddressFilterInput />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByText(/races for/i)).not.toBeInTheDocument();
  });

  it('keys autocomplete attach on the mounted input element after Change', async () => {
    storeSlice.locationFilter = located;
    render(<AddressFilterInput />);
    await userEvent.click(screen.getByRole('button', { name: 'Change address' }));
    const input = await screen.findByRole('textbox');
    const last = autocompleteCalls[autocompleteCalls.length - 1];
    expect(last.attachKey).toBe(input);
    expect(last.el).toBe(input);
  });
  it('silent auto-hydrate on load does not steal focus to the Change button', async () => {
    storeSlice.locationFilter = null;
    vi.mocked(evContext.get).mockResolvedValueOnce({
      address: { addr: '1 Main St, Salt Lake City, UT', ts: Date.now() },
    });
    searchPoliticians.mockResolvedValueOnce({ data: [{ id: 'p1' }], county: null });
    setLocationFilter.mockImplementationOnce((v: unknown) => { storeSlice.locationFilter = v; });
    const { rerender } = render(<AddressFilterInput />);
    await waitFor(() => expect(setLocationFilter).toHaveBeenCalled());
    rerender(<AddressFilterInput />);
    const change = await screen.findByRole('button', { name: 'Change address' });
    expect(document.activeElement).not.toBe(change);
  });
});
