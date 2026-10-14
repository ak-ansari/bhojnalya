import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import fixture from '../fixtures/sync-push.json' with { type: 'json' };
import { SYNC_OP_TYPES, SyncOp } from './sync-ops.js';
import {
  MAX_SYNC_BATCH,
  SyncPullQuery,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
} from './sync.js';

const DEVICE = '01a1391a-7e40-7069-a49b-8d79e28ef2ab';
const INVOICE = '01a1391a-91c8-7417-9371-0b43c1f1167b';

// A fresh deep copy of the fixture, so a test can bend it without touching the others.
function batch(): typeof fixture {
  return structuredClone(fixture);
}

function cancelOp(seq: number) {
  return {
    opId: `01a1391f-0000-7000-8000-${seq.toString(16).padStart(12, '0')}`,
    type: 'invoice.cancel',
    entityId: '01a1391a-a168-71ce-9b2d-8b7803afffc1',
    createdAt: '2026-10-14T07:00:00.000Z',
    deviceSeq: seq,
    payload: {
      invoiceId: INVOICE,
      reason: 'customer walked out',
      cancelledAt: '2026-10-14T07:00:00.000Z',
    },
  };
}

describe('SyncPushRequest', () => {
  it('reads the shared fixture, decoding paise to bigint and keeping every literal', () => {
    const push = SyncPushRequest.parse(fixture);
    expect(push.deviceId).toBe(DEVICE);
    expect(push.ops.map((op) => [op.type, op.deviceSeq])).toEqual([
      ['order.upsert', 41],
      ['kot.create', 42],
      ['invoice.create', 43],
      ['payment.create', 44],
    ]);
    const invoice = push.ops[2];
    if (invoice?.type !== 'invoice.create') throw new Error('fixture op 3 is the invoice');
    expect(invoice.entityId).toBe(INVOICE);
    expect(invoice.payload.invoiceNo).toBe('BL0A/2627/000042');
    expect(invoice.payload.lines[0]?.unitPrice).toBe(4000n);
    expect(invoice.payload.totals).toEqual({
      taxableValue: 19048n,
      cgst: 477n,
      sgst: 475n,
      discount: 0n,
      serviceCharge: 0n,
      roundOff: 0n,
      grandTotal: 20000n,
    });
    const payment = push.ops[3];
    if (payment?.type !== 'payment.create') throw new Error('fixture op 4 is the payment');
    expect(payment.payload.amount).toBe(20000n);
  });

  it('encodes a parsed batch back to the fixture document', () => {
    expect(z.encode(SyncPushRequest, SyncPushRequest.parse(fixture))).toEqual(fixture);
  });

  it('carries at most 200 ops and at least one', () => {
    expect(MAX_SYNC_BATCH).toBe(200);
    const full = { deviceId: DEVICE, ops: Array.from({ length: 200 }, (_, i) => cancelOp(i + 1)) };
    expect(SyncPushRequest.safeParse(full).success).toBe(true);
    const over = { deviceId: DEVICE, ops: Array.from({ length: 201 }, (_, i) => cancelOp(i + 1)) };
    expect(SyncPushRequest.safeParse(over).success).toBe(false);
    expect(SyncPushRequest.safeParse({ deviceId: DEVICE, ops: [] }).success).toBe(false);
  });

  it('refuses a batch that repeats an opId or a deviceSeq', () => {
    const sameSeq = { ...cancelOp(2), deviceSeq: 1 };
    const repeatedSeq = SyncPushRequest.safeParse({
      deviceId: DEVICE,
      ops: [cancelOp(1), sameSeq],
    });
    expect(repeatedSeq.error?.issues.map((i) => i.path)).toEqual([['ops', 1, 'deviceSeq']]);

    const sameId = { ...cancelOp(2), opId: cancelOp(1).opId };
    const repeatedId = SyncPushRequest.safeParse({ deviceId: DEVICE, ops: [cancelOp(1), sameId] });
    expect(repeatedId.error?.issues.map((i) => i.path)).toEqual([['ops', 1, 'opId']]);
  });

  it('accepts ops in any order; the server applies them by deviceSeq', () => {
    const reversed = batch();
    reversed.ops.reverse();
    expect(SyncPushRequest.safeParse(reversed).success).toBe(true);
  });

  it('refuses a field it does not know rather than dropping it', () => {
    const extra = batch() as { ops: { payload: Record<string, unknown> }[] };
    const op = extra.ops[2];
    if (!op) throw new Error('fixture has an invoice op');
    op.payload.tip = '1000';
    expect(SyncPushRequest.safeParse(extra).success).toBe(false);
  });

  it('refuses an amount sent as a JSON number', () => {
    const numeric = batch() as { ops: { payload: Record<string, unknown> }[] };
    const op = numeric.ops[3];
    if (!op) throw new Error('fixture has a payment op');
    op.payload.amount = 20000;
    expect(SyncPushRequest.safeParse(numeric).success).toBe(false);
  });
});

describe('SyncOp', () => {
  it('knows exactly these op types', () => {
    expect(SYNC_OP_TYPES).toEqual([
      'order.upsert',
      'kot.create',
      'invoice.create',
      'payment.create',
      'invoice.cancel',
    ]);
  });

  it('picks the payload by type', () => {
    expect(SyncOp.parse(cancelOp(1)).type).toBe('invoice.cancel');
    expect(SyncOp.safeParse({ ...cancelOp(1), type: 'payment.create' }).success).toBe(false);
    expect(SyncOp.safeParse({ ...cancelOp(1), type: 'invoice.delete' }).success).toBe(false);
  });

  it('refuses a cancellation without a reason', () => {
    const op = cancelOp(1);
    expect(SyncOp.safeParse({ ...op, payload: { ...op.payload, reason: '' } }).success).toBe(false);
  });

  it('refuses a payment of zero paise', () => {
    const fixturePayment = fixture.ops[3];
    if (!fixturePayment) throw new Error('fixture has a payment op');
    const zero = { ...fixturePayment, payload: { ...fixturePayment.payload, amount: '0' } };
    expect(SyncOp.safeParse(zero).success).toBe(false);
  });

  it('refuses an invoice number longer than 16 characters', () => {
    const fixtureInvoice = fixture.ops[2];
    if (!fixtureInvoice) throw new Error('fixture has an invoice op');
    const long = {
      ...fixtureInvoice,
      payload: { ...fixtureInvoice.payload, invoiceNo: 'BL0A/2627/0000042' },
    };
    expect(SyncOp.safeParse(long).success).toBe(false);
  });

  it('refuses a time that is not UTC', () => {
    expect(
      SyncOp.safeParse({ ...cancelOp(1), createdAt: '2026-10-14T12:30:00.000+05:30' }).success,
    ).toBe(false);
  });
});

describe('SyncPushResponse', () => {
  it('reads { acked, rejected[{ opId, reason }] }', () => {
    const body = {
      acked: ['01a1391f-1220-7545-ad73-6bae011ded99'],
      rejected: [{ opId: '01a1391f-1608-7cc5-88df-e7c3f283fc03', reason: 'VALIDATION_FAILED' }],
    };
    expect(SyncPushResponse.parse(body)).toEqual(body);
    expect(
      SyncPushResponse.safeParse({
        acked: [],
        rejected: [{ opId: body.acked[0], reason: 'bad op' }],
      }).success,
    ).toBe(false);
  });
});

describe('SyncPullResponse', () => {
  it('reads { changes, cursor }', () => {
    const body = {
      changes: [{ entity: 'stock', entityId: DEVICE, deleted: false, data: { inStock: false } }],
      cursor: 'opaque-cursor-1',
    };
    expect(SyncPullResponse.parse(body)).toEqual(body);
    expect(SyncPullResponse.safeParse({ changes: [] }).success).toBe(false);
  });

  it('starts without a cursor and continues with the one it was given', () => {
    expect(SyncPullQuery.parse({})).toEqual({});
    expect(SyncPullQuery.parse({ cursor: 'opaque-cursor-1' })).toEqual({
      cursor: 'opaque-cursor-1',
    });
  });
});
