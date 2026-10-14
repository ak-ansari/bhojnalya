import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderApp } from '@/testing/renderWithProviders';

describe('app routes', () => {
  it('sends an unregistered device to registration, whatever it opens', async () => {
    const { router } = renderApp({ role: null, route: '/pos' });
    expect(
      await screen.findByRole('heading', { name: 'Set up this tablet once.' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/register');
  });

  it('lands a device registered as the billing counter on the POS', async () => {
    const user = userEvent.setup();
    const { router, deviceStore } = renderApp({ role: null, route: '/' });

    await user.click(await screen.findByRole('button', { name: /Billing counter/ }));

    expect(await screen.findByRole('heading', { name: 'Billing counter' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/pos');
    expect(deviceStore.getState().role).toBe('pos');
  });

  it('lands a device registered as the kitchen display on the KDS', async () => {
    const user = userEvent.setup();
    const { router } = renderApp({ role: null, route: '/' });

    await user.click(await screen.findByRole('button', { name: /Kitchen display/ }));

    expect(await screen.findByText('No tickets right now.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/kds');
  });

  it('keeps a kitchen display out of the POS screens', async () => {
    const { router } = renderApp({ role: 'kds', route: '/pos' });
    expect(await screen.findByText('No tickets right now.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/kds');
    expect(screen.queryByRole('navigation', { name: 'Billing counter sections' })).toBeNull();
  });

  it('keeps a billing counter out of the KDS screens', async () => {
    const { router } = renderApp({ role: 'pos', route: '/kds' });
    expect(await screen.findByText('No open orders yet.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/pos');
  });

  it('sends an unknown path to the device home', async () => {
    const { router } = renderApp({ role: 'pos', route: '/nowhere' });
    expect(await screen.findByText('No open orders yet.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/pos');
  });
});
