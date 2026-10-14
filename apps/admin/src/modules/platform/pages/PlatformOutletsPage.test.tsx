import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/testing/renderWithProviders';

describe('PlatformOutletsPage', () => {
  it('shows the outlet list in words when there are no outlets, in the platform shell', () => {
    renderWithProviders('/platform/outlets');
    expect(screen.getByRole('heading', { level: 1, name: 'Outlets' })).toBeInTheDocument();
    expect(
      screen.getByText('No outlets yet. Create a tenant and its first outlet to get started.'),
    ).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Platform' });
    expect(within(nav).getByRole('link', { name: 'Outlets' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.queryByRole('navigation', { name: 'Owner' })).not.toBeInTheDocument();
  });
});
