import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SourceLine } from '../SourceLine';

describe('SourceLine', () => {
  it('renders a verify link when name and url are present', () => {
    render(<SourceLine sourceName="WISH-TV Governor's Debate" sourceUrl="https://example.com/debate" />);
    const link = screen.getByRole('link', { name: /verify source: WISH-TV Governor's Debate/i });
    expect(link).toHaveAttribute('href', 'https://example.com/debate');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('renders plain text when there is no url', () => {
    render(<SourceLine sourceName="Campaign Website" />);
    expect(screen.getByText('Campaign Website')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders nothing without a source name', () => {
    const { container } = render(<SourceLine sourceUrl="https://example.com" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not bubble clicks to parent handlers', async () => {
    const onParentClick = vi.fn();
    render(
      <div onClick={onParentClick}>
        <SourceLine sourceName="IndyStar" sourceUrl="https://example.com" />
      </div>
    );
    await userEvent.click(screen.getByRole('link'));
    expect(onParentClick).not.toHaveBeenCalled();
  });
});
