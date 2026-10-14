import { describe, expect, it } from 'vitest';

import { SOCKET_EVENTS, socketEventPayloads } from './socket-events.js';

const OUTLET = '01a1391a-7e40-7069-a49b-8d79e28ef2ab';
const ORDER = '01a1391a-8228-7c42-911d-a096b40a1630';
const KOT = '01a1391a-8de0-7a95-a947-ef739148015d';

describe('SOCKET_EVENTS', () => {
  it('names every event as its literal', () => {
    expect(SOCKET_EVENTS).toEqual({
      ORDER_QR_PENDING: 'order.qr_pending',
      ORDER_ACCEPTED: 'order.accepted',
      ORDER_REJECTED: 'order.rejected',
      KOT_CREATED: 'kot.created',
      KOT_UPDATED: 'kot.updated',
      KOT_READY: 'kot.ready',
      ITEM_STOCK_CHANGED: 'item.stock_changed',
      AGGREGATOR_ORDER_NEW: 'aggregator.order_new',
      TABLE_STATUS_CHANGED: 'table.status_changed',
    });
  });

  it('has a payload schema for every event and no other', () => {
    expect(Object.keys(socketEventPayloads).sort()).toEqual(
      [
        'aggregator.order_new',
        'item.stock_changed',
        'kot.created',
        'kot.ready',
        'kot.updated',
        'order.accepted',
        'order.qr_pending',
        'order.rejected',
        'table.status_changed',
      ].sort(),
    );
  });
});

describe('socketEventPayloads', () => {
  it('reads a kot.ready notification', () => {
    const payload = { outletId: OUTLET, kotId: KOT, orderId: ORDER };
    expect(socketEventPayloads['kot.ready'].parse(payload)).toEqual(payload);
  });

  it.each(Object.entries(socketEventPayloads))('%s carries ids only', (_event, schema) => {
    for (const [field, fieldSchema] of Object.entries(schema.shape)) {
      expect(fieldSchema.safeParse(OUTLET).success, `${field} accepts an id`).toBe(true);
      expect(fieldSchema.safeParse('Masala Chai').success, `${field} refuses data`).toBe(false);
    }
  });

  it('refuses a payload that smuggles state', () => {
    const withStatus = { outletId: OUTLET, kotId: KOT, orderId: ORDER, status: 'ready' };
    expect(socketEventPayloads['kot.updated'].safeParse(withStatus).success).toBe(false);
  });
});
