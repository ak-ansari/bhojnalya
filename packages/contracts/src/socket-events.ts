// Socket event names and payloads (invariant 9, TRD §9). An event is a
// notification: its payload carries ids only, and the client refetches the
// state it needs (ADR 0010). Payloads are strict so data cannot creep in.
import { z } from 'zod';

import { Uuidv7 } from './ids.js';

export const SOCKET_EVENTS = {
  ORDER_QR_PENDING: 'order.qr_pending',
  ORDER_ACCEPTED: 'order.accepted',
  ORDER_REJECTED: 'order.rejected',
  KOT_CREATED: 'kot.created',
  KOT_UPDATED: 'kot.updated',
  KOT_READY: 'kot.ready',
  ITEM_STOCK_CHANGED: 'item.stock_changed',
  AGGREGATOR_ORDER_NEW: 'aggregator.order_new',
  TABLE_STATUS_CHANGED: 'table.status_changed',
} as const;
export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

/** The payload schema for each event; every field is an id. */
export const socketEventPayloads = {
  'order.qr_pending': z.strictObject({ outletId: Uuidv7, orderId: Uuidv7 }),
  // Accepted and rejected also reach the guest's table-session room.
  'order.accepted': z.strictObject({ outletId: Uuidv7, orderId: Uuidv7, tableSessionId: Uuidv7 }),
  'order.rejected': z.strictObject({ outletId: Uuidv7, orderId: Uuidv7, tableSessionId: Uuidv7 }),
  'kot.created': z.strictObject({ outletId: Uuidv7, kotId: Uuidv7, orderId: Uuidv7 }),
  'kot.updated': z.strictObject({ outletId: Uuidv7, kotId: Uuidv7, orderId: Uuidv7 }),
  'kot.ready': z.strictObject({ outletId: Uuidv7, kotId: Uuidv7, orderId: Uuidv7 }),
  'item.stock_changed': z.strictObject({ outletId: Uuidv7, menuItemId: Uuidv7 }),
  'aggregator.order_new': z.strictObject({ outletId: Uuidv7, orderId: Uuidv7 }),
  'table.status_changed': z.strictObject({ outletId: Uuidv7, tableId: Uuidv7 }),
} as const satisfies Record<SocketEventName, z.ZodType>;

export type SocketEventPayloads = {
  [E in SocketEventName]: z.infer<(typeof socketEventPayloads)[E]>;
};

/** For typing a Socket.io server or client: one listener per event, payload typed. */
export type SocketEventListeners = {
  [E in SocketEventName]: (payload: SocketEventPayloads[E]) => void;
};
