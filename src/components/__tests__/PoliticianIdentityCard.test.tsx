import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PoliticianIdentityCard } from '../PoliticianIdentityCard';

describe('PoliticianIdentityCard', () => {
  it('renders name, position, district, and an Essentials link', () => {
    render(<PoliticianIdentityCard name="Ana Rivera" photo="" essentialsUrl="https://e/x"
      office="Council" title="City Council Member" chamber="Salt Lake City" district="District 4" />);
    expect(screen.getByText('Ana Rivera')).toBeInTheDocument();
    expect(screen.getByText('City Council Member')).toBeInTheDocument();
    expect(screen.getByText('Salt Lake City · District 4')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View on Essentials' })).toHaveAttribute('href', 'https://e/x');
  });
  it('shows initials when there is no photo', () => {
    render(<PoliticianIdentityCard name="Ben Chen" photo="" essentialsUrl="#" office="Council" />);
    expect(screen.getByText('BC')).toBeInTheDocument();
  });
});
