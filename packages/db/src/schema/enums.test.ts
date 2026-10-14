// A column enum the API stores from a request must hold exactly the values
// the contract allows, or a valid op fails to insert, or a stored value fails
// to parse on the way back out.
import {
  DeviceRole,
  KotStatus,
  OrderChannel,
  OrderType,
  PaymentMethod,
  PriceMode,
  SYNC_OP_TYPES,
  TaxMode,
} from '@bhojnalya/contracts';
import { describe, expect, it } from 'vitest';

import {
  deviceRole,
  kotStatus,
  orderChannel,
  orderType,
  paymentMethod,
  priceMode,
  syncOpType,
  taxMode,
} from './index.js';

describe('column enums', () => {
  it.each([
    ['order_channel', orderChannel.enumValues, OrderChannel.options],
    ['order_type', orderType.enumValues, OrderType.options],
    ['kot_status', kotStatus.enumValues, KotStatus.options],
    ['tax_mode', taxMode.enumValues, TaxMode.options],
    ['price_mode', priceMode.enumValues, PriceMode.options],
    ['device_role', deviceRole.enumValues, DeviceRole.options],
    ['payment_method', paymentMethod.enumValues, PaymentMethod.options],
    ['sync_op_type', syncOpType.enumValues, SYNC_OP_TYPES],
  ])('hold the same values as the contract for %s', (_name, column, contract) => {
    expect([...column]).toEqual([...contract]);
  });
});
