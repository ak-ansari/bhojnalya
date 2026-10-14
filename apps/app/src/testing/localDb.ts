// Fresh in-memory POS databases and pinned time/ids for tests. Every database
// has a name of its own, so no test sees another's data. The in-memory
// IndexedDB is global (./indexedDb.ts, a setup file): Dexie's liveQuery never
// emits for a database given its own factory through the constructor options.
import { newId, OrderUpsertPayload, type Uuidv7 } from '@bhojnalya/contracts';
import type { z } from 'zod';

import { PosDb, writeMeta, type DeviceIdentity } from '@/libs/local-db/db';
import type { LocalDeps } from '@/libs/local-db/deps';
import { appendOp } from '@/libs/sync/outbox';

let created = 0;

export function createTestDb(): PosDb {
  created += 1;
  return new PosDb(`pos-test-${String(created)}`);
}

export const TEST_DEVICE: DeviceIdentity = {
  deviceId: '01a1391a-7e40-7069-a49b-8d79e28ef2ab',
  outletPrefix: 'BL',
  deviceCode: '0A',
};

export function pairDevice(db: PosDb, device: DeviceIdentity = TEST_DEVICE): Promise<void> {
  return writeMeta(db, 'device', device);
}

/** A clock you move by hand, and ids that follow it (or come from `ids` first, in order). */
export interface TestDeps extends LocalDeps {
  setNow: (iso: string) => void;
}

export function testDeps(startIso = '2026-10-14T06:30:00.000Z', ids: string[] = []): TestDeps {
  let ms = Date.parse(startIso);
  let counter = 0;
  const queue = [...ids];
  return {
    now: () => new Date(ms),
    setNow: (iso) => {
      ms = Date.parse(iso);
    },
    newId: () =>
      (queue.shift() as Uuidv7 | undefined) ??
      newId({
        now: () => ms,
        fillRandom: (bytes) => {
          counter += 1;
          bytes.fill(0);
          bytes[bytes.length - 1] = counter % 256;
          bytes[bytes.length - 2] = Math.floor(counter / 256) % 256;
        },
      }),
  };
}

/** Two masala chai and a veg sandwich, inclusive 5%: ₹200.00 (the sync-push fixture's order). */
export function chaiAndSandwich(updatedAt = '2026-10-14T06:30:05.000Z') {
  return OrderUpsertPayload.parse({
    channel: 'pos',
    type: 'dine_in',
    tableId: '01a1391a-a168-71ce-9b2d-8b7803afffc1',
    items: [
      {
        id: '01a1391a-8610-77ee-88e4-42f1ccc63bb8',
        menuItemId: '01a1391a-9998-7ea1-8400-e68458919817',
        name: 'Masala Chai',
        hsn: '996331',
        unitPrice: '4000',
        quantity: 2,
        taxRateBp: 500,
        modifiers: [],
      },
      {
        id: '01a1391a-89f8-7362-84a3-0c741bbc199b',
        menuItemId: '01a1391a-9d80-7924-8be3-9341a2323697',
        name: 'Veg Sandwich',
        hsn: '996331',
        unitPrice: '12000',
        quantity: 1,
        taxRateBp: 500,
        modifiers: [],
        note: 'no onion',
      },
    ],
    updatedAt,
  } satisfies z.input<typeof OrderUpsertPayload>);
}

/** The item at `index`; throws instead of returning `undefined`. */
export function nth<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`no item at ${String(index)}`);
  return item;
}

/** Appends `count` order ops in one transaction; faster than `count` saved orders. */
export async function seedOps(db: PosDb, count: number, deps: LocalDeps): Promise<void> {
  const order = chaiAndSandwich();
  await db.transaction('rw', [db.meta, db.outbox], async () => {
    for (let i = 0; i < count; i += 1) {
      await appendOp(db, { type: 'order.upsert', entityId: deps.newId(), payload: order }, deps);
    }
  });
}
