import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/testing/renderWithProviders';

describe('OwnerMenuPage', () => {
  it('shows menu and stock in words when there are no items yet', () => {
    renderWithProviders('/owner/menu');
    expect(screen.getByRole('heading', { level: 1, name: 'Menu & stock' })).toBeInTheDocument();
    expect(
      screen.getByText('No menu items yet. Add a category, then the items in it.'),
    ).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Owner' });
    expect(within(nav).getByRole('link', { name: 'Menu & stock' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
