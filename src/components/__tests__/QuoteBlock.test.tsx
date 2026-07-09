import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuoteBlock } from '../QuoteBlock';
import type { RevealQuote } from '../../data/api';

const base: RevealQuote = {
  quoteId: 'q', supported: true, rank: 1,
  text: 'cap the fees that cities pile on builders',
  verbatimText: 'We need to cap the fees that cities pile on builders and stop lawsuits.',
  editorNote: 'Trimmed a closing aside.',
  sourceName: 'KSL debate', sourceDate: 'Oct 3, 2025', sourceUrl: 'https://ksl/x',
  videoUrl: 'https://v/x', videoTimestampSeconds: 743,
};

describe('QuoteBlock', () => {
  it('shows the edited quote and source + date by default', () => {
    render(<QuoteBlock topicTitle="Housing" quote={base} mark={{ kind: 'rank', rank: 1 }} />);
    expect(screen.getByText(/cap the fees/)).toBeInTheDocument();
    // Attribution text is split across span + anchor, so assert on the container.
    const attrib = document.querySelector('.quote-attrib')!;
    expect(attrib.textContent).toContain('KSL debate');
    expect(attrib.textContent).toContain('Oct 3, 2025');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
  it('expands to verbatim with the edited span bold + editor note', async () => {
    const user = userEvent.setup();
    render(<QuoteBlock topicTitle="Housing" quote={base} mark={{ kind: 'rank', rank: 1 }} />);
    await user.click(screen.getByRole('button', { name: /show full quote/i }));
    const bold = screen.getByText('cap the fees that cities pile on builders', { selector: 'b' });
    expect(bold).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editor's note/i })).toBeInTheDocument();
  });
  it('offers a video deep-link when present', () => {
    render(<QuoteBlock topicTitle="Housing" quote={base} mark={{ kind: 'agreed' }} />);
    expect(screen.getByRole('link', { name: /watch at 12:23/i })).toHaveAttribute('href', 'https://v/x?t=743');
  });
  it('omits the full-quote toggle when there is no verbatim text', () => {
    render(<QuoteBlock topicTitle="Housing" quote={{ ...base, verbatimText: undefined }} mark={{ kind: 'rank', rank: 1 }} />);
    expect(screen.queryByRole('button', { name: /show full quote/i })).not.toBeInTheDocument();
  });
  it('appends t= without corrupting a video URL that already has a query string', () => {
    render(<QuoteBlock topicTitle="Housing"
      quote={{ ...base, videoUrl: 'https://www.youtube.com/watch?v=example', videoTimestampSeconds: 512 }}
      mark={{ kind: 'agreed' }} />);
    expect(screen.getByRole('link', { name: /watch at 8:32/i }))
      .toHaveAttribute('href', 'https://www.youtube.com/watch?v=example&t=512');
  });
  it('shows a View source link (and no Watch link) when only a source URL is present', () => {
    render(<QuoteBlock topicTitle="Housing"
      quote={{ ...base, videoUrl: undefined, videoTimestampSeconds: undefined }}
      mark={{ kind: 'rank', rank: 1 }} />);
    expect(screen.getByRole('link', { name: /view source/i })).toHaveAttribute('href', 'https://ksl/x');
    expect(screen.queryByRole('link', { name: /watch at/i })).not.toBeInTheDocument();
  });
  it('renders plain verbatim (no bold, no crash) when edited text is not a substring', async () => {
    const user = userEvent.setup();
    render(<QuoteBlock topicTitle="Housing"
      quote={{ ...base, text: 'totally different edit', verbatimText: 'The full original quote as spoken.' }}
      mark={{ kind: 'rank', rank: 1 }} />);
    await user.click(screen.getByRole('button', { name: /show full quote/i }));
    const verbatim = document.querySelector('.quote-verbatim')!;
    expect(verbatim.textContent).toContain('The full original quote as spoken.');
    expect(verbatim.querySelector('b')).toBeNull();
  });
});
