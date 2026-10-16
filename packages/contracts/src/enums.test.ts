import { describe, expect, it } from 'vitest';

import {
  DeviceRole,
  KotStatus,
  OrderChannel,
  OrderType,
  OutletRole,
  PaymentMethod,
  PriceMode,
  TaxMode,
} from './enums.js';

describe('shared enums', () => {
  it.each([
    ['OrderChannel', OrderChannel.options, ['pos', 'qr', 'swiggy', 'zomato']],
    ['OrderType', OrderType.options, ['dine_in', 'takeaway', 'delivery']],
    ['KotStatus', KotStatus.options, ['new', 'preparing', 'ready']],
    ['TaxMode', TaxMode.options, ['regular', 'composition', 'unregistered']],
    ['PriceMode', PriceMode.options, ['inclusive', 'exclusive']],
    ['DeviceRole', DeviceRole.options, ['pos', 'kds']],
    ['PaymentMethod', PaymentMethod.options, ['cash', 'upi', 'card', 'other']],
    ['OutletRole', OutletRole.options, ['owner', 'manager', 'cashier', 'captain', 'kitchen']],
  ])('%s is exactly its literal values', (_name, options, literals) => {
    expect(options).toEqual(literals);
  });

  it('refuses a value outside the list', () => {
    expect(OrderType.safeParse('dine-in').success).toBe(false);
    expect(KotStatus.safeParse('served').success).toBe(false);
  });
});
