import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuestionBanner } from '../QuestionBanner';

describe('QuestionBanner', () => {
  it('renders the question inside the highlight span', () => {
    render(<QuestionBanner question="How to fix housing?" />);
    const hl = screen.getByText('How to fix housing?');
    expect(hl).toHaveClass('question-banner-hl');
    expect(hl.closest('.question-banner')).not.toBeNull();
  });
});
