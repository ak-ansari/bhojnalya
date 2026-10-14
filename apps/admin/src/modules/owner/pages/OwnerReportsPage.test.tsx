import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/testing/renderWithProviders';

describe('OwnerReportsPage', () => {
  it('shows reports in words when the outlet has not billed yet', () => {
    renderWithProviders('/owner/reports');
    expect(screen.getByRole('heading', { level: 1, name: 'Reports' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'No reports yet. Reports fill in once the outlet has billed its first sale.',
      ),
    ).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Owner' });
    expect(within(nav).getByRole('link', { name: 'Reports' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
