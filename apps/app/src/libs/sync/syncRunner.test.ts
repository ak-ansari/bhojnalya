import {
  IDEMPOTENCY_KEY_HEADER,
  SyncPushRequest,
  type SyncPushRequestWire,
  type SyncPushResponse,
} from '@bhojnalya/contracts';
import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { countOutbox } from './outbox';
import { createSyncRunner } from './syncRunner';

import { API_ENDPOINTS } from '@/libs/api/endpoints';
import { server } from '@/mocks/server';
import { createTestDb, nth, pairDevice, seedOps, TEST_DEVICE, testDeps } from '@/testing/localDb';

type Answer = (request: SyncPushRequestWire) => SyncPushResponse | Response;

/** A push endpoint that records every body and header, and answers with `answer`. */
function pushEndpoint(answer: Answer = ackAll) {
  const bodies: SyncPushRequestWire[] = [];
  const keys: (string | null)[] = [];
  server.use(
    http.post(API_ENDPOINTS.SYNC.PUSH, async ({ request }) => {
      const body = (await request.json()) as SyncPushRequestWire;
      bodies.push(body);
      keys.push(request.headers.get(IDEMPOTENCY_KEY_HEADER));
      const result = answer(body);
      return result instanceof Response ? result : HttpResponse.json(result);
    }),
  );
  return { bodies, keys };
}

function ackAll(request: SyncPushRequestWire): SyncPushResponse {
  return { acked: request.ops.map((op) => op.opId as never), rejected: [] };
}

async function pairedDbWith(count: number) {
  const db = createTestDb();
  await pairDevice(db);
  await seedOps(db, count, testDeps());
  return db;
}

describe('syncRunner', () => {
  // 450 ops through fake IndexedDB and MSW take ~1 s idle but well over the
  // default 5 s on a loaded machine or CI runner.
  it(
    'pushes in batches of at most 200, in deviceSeq order, until the outbox is empty',
    { timeout: 30_000 },
    async () => {
      const db = await pairedDbWith(450);
      const { bodies } = pushEndpoint();

      const round = await createSyncRunner({ db }).syncNow();

      expect(round).toMatchObject({ status: 'done', acked: 450, rejected: 0 });
      expect(bodies.map((body) => body.ops.length)).toEqual([200, 200, 50]);
      const seqs = bodies.flatMap((body) => body.ops.map((op) => op.deviceSeq));
      expect(seqs).toEqual(Array.from({ length: 450 }, (_, i) => i + 1));
      expect(await db.outbox.count()).toBe(0);
    },
  );

  it('sends a body the contract accepts, with the device id and an idempotency key', async () => {
    const db = await pairedDbWith(2);
    const { bodies, keys } = pushEndpoint();

    await createSyncRunner({ db }).syncNow();

    expect(bodies[0]?.deviceId).toBe(TEST_DEVICE.deviceId);
    expect(() => SyncPushRequest.parse(bodies[0])).not.toThrow();
    expect(keys[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
  });

  it('removes only acked ops, keeps refused ones flagged and stops on unanswered ones', async () => {
    const db = await pairedDbWith(3);
    const { bodies } = pushEndpoint(({ ops }) => ({
      acked: [nth(ops, 0).opId as never],
      rejected: [{ opId: nth(ops, 1).opId as never, reason: 'VALIDATION_FAILED' }],
    }));

    const round = await createSyncRunner({ db }).syncNow();

    expect(round).toMatchObject({ status: 'done', acked: 1, rejected: 1 });
    expect(bodies).toHaveLength(1);
    expect(await countOutbox(db)).toEqual({ pending: 1, rejected: 1, total: 2 });
  });

  it('keeps every op when the push fails', async () => {
    const db = await pairedDbWith(3);
    pushEndpoint(() => HttpResponse.json({ code: 'INTERNAL' }, { status: 500 }));

    const round = await createSyncRunner({ db }).syncNow();

    expect(round.status).toBe('failed');
    expect(await db.outbox.count()).toBe(3);
  });

  it('does not push from a device that is not paired or not online', async () => {
    const unpaired = createTestDb();
    await seedOps(unpaired, 1, testDeps());
    const db = await pairedDbWith(1);
    const { bodies } = pushEndpoint();

    expect((await createSyncRunner({ db: unpaired }).syncNow()).status).toBe('unpaired');
    expect((await createSyncRunner({ db, isOnline: () => false }).syncNow()).status).toBe(
      'offline',
    );
    expect(bodies).toHaveLength(0);
  });

  it('joins a round already running instead of pushing the same ops twice', async () => {
    const db = await pairedDbWith(2);
    const { bodies } = pushEndpoint();
    const runner = createSyncRunner({ db });

    await Promise.all([runner.syncNow(), runner.syncNow()]);

    expect(bodies).toHaveLength(1);
  });

  it('pushes when the network comes back', async () => {
    const db = await pairedDbWith(1);
    let online = false;
    const { bodies } = pushEndpoint();
    const stop = createSyncRunner({ db, isOnline: () => online, intervalMs: 60_000 }).start();

    online = true;
    window.dispatchEvent(new Event('online'));

    await waitFor(() => {
      expect(bodies).toHaveLength(1);
    });
    stop();
  });

  it('retries on its interval while ops are waiting', async () => {
    const db = await pairedDbWith(1);
    let fail = true;
    const { bodies } = pushEndpoint((request) =>
      fail ? HttpResponse.json({ code: 'INTERNAL' }, { status: 503 }) : ackAll(request),
    );
    const stop = createSyncRunner({ db, isOnline: () => true, intervalMs: 20 }).start();
    await waitFor(() => {
      expect(bodies.length).toBeGreaterThan(0);
    });

    fail = false;

    await waitFor(async () => {
      expect(await db.outbox.count()).toBe(0);
    });
    stop();
  });
});
