import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Landing } from '../Landing';
import { useReadRankStore } from '../../store/useReadRankStore';

const located = {
  address: '100 W Kirkwood Ave, Bloomington, IN 47404', politicianIds: [], state: 'IN',
  county: null, countyName: null, jurisdiction: null,
};

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

describe('Landing', () => {
  it('renders the hero heading, lede and the three steps as an ordered list', () => {
    render(<Landing />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/read candidates blind/i);
    expect(screen.getByText(/with no names and no parties/i)).toBeInTheDocument();
    const steps = screen.getByRole('list', { name: /how it works/i });
    expect(steps.tagName).toBe('OL');
    expect(steps).toHaveTextContent(/pick an election/i);
    expect(steps).toHaveTextContent(/read the quotes/i);
    expect(steps).toHaveTextContent(/rank the candidates/i);
    expect(screen.queryByText(/start here/i)).not.toBeInTheDocument();
  });

  it('"Choose an election" scrolls to the race section and focuses its heading', async () => {
    render(<Landing />);
    await userEvent.click(screen.getByRole('button', { name: /choose an election/i }));
    const h2 = screen.getByRole('heading', { level: 2, name: /choose an election/i });
    expect(h2.closest('#choose-election')).not.toBeNull();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(h2).toHaveFocus();
  });

  it('offers practice as an opt-in warm-up', async () => {
    render(<Landing />);
    await userEvent.click(screen.getByRole('button', { name: /try a warm-up with pizza opinions/i }));
    expect(useReadRankStore.getState().phase).toBe('practice');
    expect(useReadRankStore.getState().practiceProgress).not.toBeNull();
  });

  it('with no address: the search box sits in the race section and there is no switch', () => {
    render(<Landing />);
    const section = document.getElementById('choose-election')!;
    expect(section).toContainElement(screen.getByRole('textbox'));
    expect(screen.queryByRole('group', { name: /filter by election timing/i })).not.toBeInTheDocument();
  });

  it('with an address: shows "Races for … Change" and the switch drives the list', async () => {
    useReadRankStore.getState().setLocationFilter(located);
    render(<Landing />);
    expect(screen.getByText(/races for/i)).toHaveTextContent('100 W Kirkwood Ave');
    expect(screen.getByRole('button', { name: 'Change address' })).toBeInTheDocument();
    // The demo Indiana race (2024-11-05) is past — switch to Past to see it.
    await userEvent.click(screen.getByRole('button', { name: 'Past' }));
    expect(await screen.findByText('Governor', undefined, { timeout: 3000 })).toBeInTheDocument();
    // Only one switch on the page (RaceHub's own is hidden).
    expect(screen.getAllByRole('group', { name: /filter by election timing/i })).toHaveLength(1);
  });

  it('in Browse: hides the hero, the picker heading, the address box and the switch', () => {
    useReadRankStore.getState().setLocationFilter(located);
    useReadRankStore.getState().setBrowseTarget({ state: 'IN', geoid: null });
    render(<Landing />);
    expect(screen.queryByText(/read candidates blind/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /how it works/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: /choose an election/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/races for/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /filter by election timing/i })).not.toBeInTheDocument();
  });

  it('leaving Browse brings the hero back and scrolls to the picker', () => {
    useReadRankStore.getState().setBrowseTarget({ state: '', geoid: null });
    render(<Landing />);
    expect(screen.queryByText(/read candidates blind/i)).not.toBeInTheDocument();
    (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();
    act(() => { useReadRankStore.getState().setBrowseTarget(null); });
    expect(screen.getByText(/read candidates blind/i)).toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
