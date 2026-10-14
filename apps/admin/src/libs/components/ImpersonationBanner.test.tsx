import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { makeAccessToken } from '@/testing/makeAccessToken';
import { renderWithProviders } from '@/testing/renderWithProviders';

const VIEW_AS = makeAccessToken({
  sub: 'owner-1',
  tenant_id: 'tenant-1',
  impersonated_by: 'admin-7',
});
const OWNER = makeAccessToken({ sub: 'owner-1', tenant_id: 'tenant-1' });

describe('ImpersonationBanner', () => {
  it.each(['/owner/dashboard', '/owner/menu', '/owner/reports', '/platform/outlets'])(
    'shows the red view-as banner on %s while the token names an impersonator',
    (url) => {
      renderWithProviders(url, { accessToken: VIEW_AS });
      const banner = screen.getByRole('alert');
      expect(banner).toHaveTextContent('Viewing as the owner');
      expect(banner).toHaveTextContent(
        'Everything you do now is written to the audit log as you, on behalf of the owner.',
      );
      expect(banner).toHaveClass('bg-danger');
    },
  );

  it('shows no banner to an owner signed in as themselves', () => {
    renderWithProviders('/owner/dashboard', { accessToken: OWNER });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows no banner without a token', () => {
    renderWithProviders('/owner/dashboard');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('drops the view-as token and returns to the platform console on exit', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders('/owner/dashboard', { accessToken: VIEW_AS });
    await user.click(screen.getByRole('button', { name: 'Exit view-as' }));
    expect(router.state.location.pathname).toBe('/platform/outlets');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
