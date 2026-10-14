import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { writeMeta } from '@/libs/local-db/db';
import { createTestDb, seedOps, testDeps } from '@/testing/localDb';
import { renderApp } from '@/testing/renderWithProviders';

function banner(name: string) {
  return screen.queryByText(name, { exact: false });
}

describe('PosLayout', () => {
  it('shows how many changes have not synced in the top bar', async () => {
    const db = createTestDb();
    await seedOps(db, 3, testDeps());
    renderApp({ role: 'pos', route: '/pos', db });

    expect(await screen.findByRole('link', { name: '3 not synced' })).toBeInTheDocument();
  });

  it('shows all synced when the outbox is empty, and updates as ops are added', async () => {
    const { db } = renderApp({ role: 'pos', route: '/pos' });
    expect(await screen.findByRole('link', { name: 'All synced' })).toBeInTheDocument();

    await act(() => seedOps(db, 1, testDeps()));

    expect(await screen.findByRole('link', { name: '1 not synced' })).toBeInTheDocument();
  });

  it('counts refused changes apart, and still as not synced', async () => {
    const db = createTestDb();
    await seedOps(db, 2, testDeps());
    await db.outbox.update(1, { rejection: { reason: 'VALIDATION_FAILED', at: 'x' } });
    renderApp({ role: 'pos', route: '/pos', db });

    expect(await screen.findByRole('link', { name: '2 not synced 1 refused' })).toBeInTheDocument();
  });

  it('says in the offline strip how many changes are waiting', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const db = createTestDb();
    await seedOps(db, 2, testDeps());
    renderApp({ role: 'pos', route: '/pos', db });

    expect(await screen.findByText(/2 changes are waiting to sync\./)).toBeInTheDocument();
    expect(banner('Keep billing as usual.')).toBeInTheDocument();
  });

  it('says billing is paused while the clock is behind the last bill', async () => {
    const db = createTestDb();
    await writeMeta(db, 'lastInvoiceAt', new Date(Date.now() + 60 * 60_000).toISOString());
    renderApp({ role: 'pos', route: '/pos', db });

    expect(await screen.findByText("This tablet's clock is behind its last bill.")).toBeVisible();
    expect(banner('Billing is paused')).toBeInTheDocument();
  });

  it('says nothing about the clock when it is at or past the last bill', async () => {
    const db = createTestDb();
    await writeMeta(db, 'lastInvoiceAt', new Date(Date.now() - 60_000).toISOString());
    renderApp({ role: 'pos', route: '/pos', db });

    await screen.findByRole('link', { name: 'All synced' });
    expect(banner("This tablet's clock is behind")).not.toBeInTheDocument();
  });

  it('asks for persistent storage and warns when the browser refuses it', async () => {
    const persist = vi.fn(() => Promise.resolve(false));
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { persisted: () => Promise.resolve(false), persist },
    });
    renderApp({ role: 'pos', route: '/pos' });

    expect(await screen.findByText('Bills on this tablet are not protected yet.')).toBeVisible();
    expect(banner('may delete saved bills')).toBeInTheDocument();
    expect(persist).toHaveBeenCalledOnce();
  });

  it('tells an iPad not opened from the Home Screen to install the app', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
    );
    renderApp({ role: 'pos', route: '/pos' });

    expect(await screen.findByText(/Add Bhojnalya to the Home Screen/)).toBeVisible();
  });

  it('shows no storage warning once storage is persistent', async () => {
    renderApp({ role: 'pos', route: '/pos' });

    await screen.findByRole('link', { name: 'All synced' });
    await waitFor(() => {
      expect(banner('not protected')).not.toBeInTheDocument();
    });
  });
});
