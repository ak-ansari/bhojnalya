import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/testing/renderWithProviders';

describe('ROUTES', () => {
  it.each([
    ['/', '/owner/dashboard'],
    ['/owner', '/owner/dashboard'],
    ['/platform', '/platform/outlets'],
  ])('sends %s to %s', async (from, to) => {
    const { router } = renderWithProviders(from);
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(to);
  });

  it('says in words when an address leads nowhere', () => {
    renderWithProviders('/owner/nothing-here');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the dashboard' })).toHaveAttribute(
      'href',
      '/owner/dashboard',
    );
  });
});
