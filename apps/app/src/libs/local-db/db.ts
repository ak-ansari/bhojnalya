// The till's own database (ADR 0006, TRD §8.2): every POS change is written
// here first, and the outbox carries it to the server. Records keep money in
// its wire form, digit strings, and are decoded with the contracts' schemas
// when read (ADR 0025).
import type {
  InvoiceCreatePayload,
  OrderUpsertPayload,
  PaymentCreatePayload,
  SyncOpWire,
} from '@bhojnalya/contracts';
import Dexie, { type DexieOptions, type EntityTable } from 'dexie';
import type { z } from 'zod';

export const LOCAL_DB_NAME = 'bhojnalya-pos';

/** One sync op waiting for the server's ack, in device order. */
export interface OutboxRecord {
  /** Primary key: strictly increasing on this device, never reused. */
  deviceSeq: number;
  opId: string;
  /** Exactly what is pushed: validated by the contract when appended. */
  op: SyncOpWire;
  /** Set when the server refused the op; it stays here until staff retry it. */
  rejection: { reason: string; at: string } | null;
}

/** Invoices issued per financial year on this device; `lastSeq` is the last number used. */
export interface DeviceCounterRecord {
  fy: string;
  lastSeq: number;
}

export type OrderStatus = 'open' | 'billed';

export interface OrderRecord {
  id: string;
  status: OrderStatus;
  updatedAt: string;
  order: z.input<typeof OrderUpsertPayload>;
}

export interface InvoiceRecord {
  id: string;
  invoiceNo: string;
  orderId: string;
  issuedAt: string;
  invoice: z.input<typeof InvoiceCreatePayload>;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  payment: z.input<typeof PaymentCreatePayload>;
}

/** The menu as last pulled; its shape belongs to the menu module. */
export interface MenuSnapshotRecord {
  id: 'current';
  version: number;
  pulledAt: string;
  data: unknown;
}

export interface TableRecord {
  id: string;
  floorId: string;
  name: string;
}

/** Who this device is, written at pairing. The prefix and code make its invoice series. */
export interface DeviceIdentity {
  deviceId: string;
  outletPrefix: string;
  deviceCode: string;
}

/** Single values the device keeps, by key. */
export interface MetaValues {
  device: DeviceIdentity;
  /** The last deviceSeq handed out, so a seq is never reused after its op is acked. */
  deviceSeq: number;
  /** ISO instant of the last invoice; the clock guard compares against it. */
  lastInvoiceAt: string;
  pullCursor: string;
}

export type MetaKey = keyof MetaValues;

export interface MetaRecord {
  key: MetaKey;
  value: MetaValues[MetaKey];
}

export class PosDb extends Dexie {
  outbox!: EntityTable<OutboxRecord, 'deviceSeq'>;
  deviceCounters!: EntityTable<DeviceCounterRecord, 'fy'>;
  orders!: EntityTable<OrderRecord, 'id'>;
  invoices!: EntityTable<InvoiceRecord, 'id'>;
  payments!: EntityTable<PaymentRecord, 'id'>;
  menu!: EntityTable<MenuSnapshotRecord, 'id'>;
  diningTables!: EntityTable<TableRecord, 'id'>;
  meta!: EntityTable<MetaRecord, 'key'>;

  constructor(name: string = LOCAL_DB_NAME, options?: DexieOptions) {
    super(name, options);
    // A schema change is a new version() with an upgrade, never an edit of this one.
    this.version(1).stores({
      outbox: '&deviceSeq, &opId',
      deviceCounters: '&fy',
      orders: '&id, status, updatedAt',
      invoices: '&id, &invoiceNo, orderId, issuedAt',
      payments: '&id, invoiceId',
      menu: '&id',
      diningTables: '&id, floorId',
      meta: '&key',
    });
  }

  /** Every table, for transactions that must cover the whole device (clear, reset). */
  get allTables() {
    return [
      this.outbox,
      this.deviceCounters,
      this.orders,
      this.invoices,
      this.payments,
      this.menu,
      this.diningTables,
      this.meta,
    ];
  }
}

/** Reads one meta value, typed by its key; `undefined` when never written. */
export async function readMeta<K extends MetaKey>(
  db: PosDb,
  key: K,
): Promise<MetaValues[K] | undefined> {
  const record = await db.meta.get(key);
  return record?.value as MetaValues[K] | undefined;
}

export async function writeMeta<K extends MetaKey>(
  db: PosDb,
  key: K,
  value: MetaValues[K],
): Promise<void> {
  await db.meta.put({ key, value });
}
