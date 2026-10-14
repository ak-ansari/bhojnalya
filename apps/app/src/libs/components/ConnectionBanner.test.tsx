import { act, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConnectionBanner } from './ConnectionBanner';

import { renderApp, renderWithProviders } from '@/testing/renderWithProviders';

function setNetwork(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
  });
}

describe('ConnectionBanner', () => {
  it('shows nothing while the device is online', () => {
    renderWithProviders(<ConnectionBanner role="pos" />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('tells the till to keep billing when the network drops', () => {
    renderWithProviders(<ConnectionBanner role="pos" />);
    setNetwork(false);

    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent("You're offline.");
    expect(banner).toHaveTextContent('Keep billing as usual.');
    expect(banner).toHaveTextContent('Bills are saved on this tablet');
  });

  it('tells the kitchen it is reconnecting and to use printed KOTs', () => {
    renderWithProviders(<ConnectionBanner role="kds" />);
    setNetwork(false);

    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent("You're offline.");
    expect(banner).toHaveTextContent('Reconnecting…');
    expect(banner).toHaveTextContent('Use the printed KOTs');
    expect(banner).not.toHaveTextContent('Keep billing');
  });

  it('goes away when the network comes back', () => {
    renderWithProviders(<ConnectionBanner role="pos" />);
    setNetwork(false);
    expect(screen.getByRole('status')).toBeInTheDocument();

    setNetwork(true);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows on the first render of a device that starts offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderWithProviders(<ConnectionBanner role="pos" />);
    expect(screen.getByRole('status')).toHaveTextContent("You're offline.");
  });

  it('sits in the POS screen frame under the top bar', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderApp({ role: 'pos', route: '/pos' });

    expect(await screen.findByRole('heading', { name: 'Billing counter' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Keep billing as usual.');
  });
});
