import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SourceInfoButton } from '../SourceExplainer';

describe('SourceInfoButton', () => {
  it('opens the explainer dialog on click', async () => {
    render(<SourceInfoButton />);
    await userEvent.click(screen.getByRole('button', { name: /how we source quotes/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName(/how we source quotes/i);
    expect(dialog).toHaveTextContent(/four kinds of sources/i);
    expect(dialog).toHaveTextContent(/hide each quote's source on purpose/i);
  });

  it('closes via the close button and unmounts the dialog', async () => {
    render(<SourceInfoButton />);
    await userEvent.click(screen.getByRole('button', { name: /how we source quotes/i }));
    await userEvent.click(screen.getByRole('button', { name: /^close$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a visible text label when showLabel is set', () => {
    render(<SourceInfoButton showLabel />);
    expect(screen.getByRole('button', { name: /how we source quotes/i })).toHaveTextContent(
      'How we source quotes'
    );
  });
});
