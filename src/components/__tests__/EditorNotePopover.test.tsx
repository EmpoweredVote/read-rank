import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorNotePopover } from '../EditorNotePopover';

describe('EditorNotePopover', () => {
  it('hides the note until the trigger is activated (keyboard/tap)', async () => {
    const user = userEvent.setup();
    render(<EditorNotePopover note="Trimmed for length." />);
    expect(screen.queryByText('Trimmed for length.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /editor's note/i }));
    expect(screen.getByText('Trimmed for length.')).toBeInTheDocument();
  });
});
