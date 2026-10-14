import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createTestDb, pairDevice, seedOps, testDeps } from '@/testing/localDb';
import { renderApp } from '@/testing/renderWithProviders';

// jsdom's Blob has no text(); FileReader reads it.
function readBlob(blob: Blob | undefined): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!blob) {
      reject(new Error('no blob'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject(new Error('unreadable blob'));
    };
    reader.readAsText(blob);
  });
}

async function unsyncedDb(count: number) {
  const db = createTestDb();
  await seedOps(db, count, testDeps());
  return db;
}

describe('PosDevicePage', () => {
  it('blocks clearing and resetting while changes have not synced, and says how many', async () => {
    const db = await unsyncedDb(3);
    renderApp({ role: 'pos', route: '/pos/device', db });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Blocked: 3 changes have not synced yet.',
    );
    expect(screen.getByRole('button', { name: 'Clear data on this tablet' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset this tablet' })).toBeDisabled();
    expect(await db.outbox.count()).toBe(3);
  });

  it('still blocks them when the only change waiting is one the server refused', async () => {
    const db = await unsyncedDb(1);
    await db.outbox.update(1, { rejection: { reason: 'VALIDATION_FAILED', at: 'x' } });
    renderApp({ role: 'pos', route: '/pos/device', db });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Blocked: 1 change has not synced yet.',
    );
    expect(screen.getByRole('button', { name: 'Reset this tablet' })).toBeDisabled();
  });

  it('clears every local table once everything has synced', async () => {
    const db = createTestDb();
    await pairDevice(db);
    await db.deviceCounters.put({ fy: '2627', lastSeq: 9 });
    renderApp({ role: 'pos', route: '/pos/device', db });

    await userEvent.click(await screen.findByRole('button', { name: 'Clear data on this tablet' }));

    expect(await screen.findByText('Data on this tablet was cleared.')).toBeInTheDocument();
    expect(await db.deviceCounters.count()).toBe(0);
    expect(await db.meta.count()).toBe(0);
  });

  it('resets the tablet back to set-up once everything has synced', async () => {
    const { deviceStore } = renderApp({ role: 'pos', route: '/pos/device' });

    await userEvent.click(await screen.findByRole('button', { name: 'Reset this tablet' }));

    expect(await screen.findByText('Set up this tablet once.')).toBeInTheDocument();
    expect(deviceStore.getState().role).toBeNull();
  });

  it('exports the unsynced changes as JSON and CSV files', async () => {
    const createObjectURL = vi.fn((blob: Blob) => `blob:${blob.type}`);
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const db = await unsyncedDb(2);
    renderApp({ role: 'pos', route: '/pos/device', db });

    await userEvent.click(await screen.findByRole('button', { name: 'Export unsynced (JSON)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Export unsynced (CSV)' }));

    await waitFor(() => {
      expect(click).toHaveBeenCalledTimes(2);
    });
    const [json, csv] = createObjectURL.mock.calls.map(([blob]) => blob);
    expect(json?.type).toBe('application/json');
    expect(JSON.parse(await readBlob(json))).toMatchObject({
      ops: [{ deviceSeq: 1 }, { deviceSeq: 2 }],
    });
    expect(csv?.type).toBe('text/csv');
    expect((await readBlob(csv)).split('\r\n')).toHaveLength(4);
  });

  it('puts refused changes back in line when staff retry them', async () => {
    const db = await unsyncedDb(1);
    await db.outbox.update(1, { rejection: { reason: 'VALIDATION_FAILED', at: 'x' } });
    renderApp({ role: 'pos', route: '/pos/device', db });

    expect(await screen.findByText(/The server refused 1 of them/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry refused changes' }));

    await waitFor(async () => {
      expect((await db.outbox.get(1))?.rejection).toBeNull();
    });
    expect(screen.queryByText(/The server refused/)).not.toBeInTheDocument();
  });
});
