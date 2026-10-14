import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/testing/renderWithProviders';

describe('OwnerDashboardPage', () => {
  it('shows the dashboard in words when there is nothing to show yet', () => {
    renderWithProviders('/owner/dashboard');
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(
      screen.getByText('No sales yet today. Bills appear here as the counter syncs them.'),
    ).toBeInTheDocument();
  });

  it('sits in the owner shell with Dashboard marked as the current page', () => {
    renderWithProviders('/owner/dashboard');
    const nav = screen.getByRole('navigation', { name: 'Owner' });
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Menu & stock' })).toHaveAttribute(
      'href',
      '/owner/menu',
    );
    expect(within(nav).getByRole('link', { name: 'Reports' })).toHaveAttribute(
      'href',
      '/owner/reports',
    );
  });
});
