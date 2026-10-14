// Typed refusals from the POS's local writes; each is thrown before anything is written.

/** The device has no identity (prefix, device code) yet, so it has no invoice series. */
export class DeviceNotPairedError extends Error {
  readonly code = 'DEVICE_NOT_PAIRED';
  override readonly name = 'DeviceNotPairedError';

  constructor() {
    super('this device is not paired, so it has no invoice series');
  }
}

export class OrderNotFoundError extends Error {
  readonly code = 'ORDER_NOT_FOUND';
  override readonly name = 'OrderNotFoundError';

  constructor(readonly orderId: string) {
    super(`order ${orderId} is not on this device`);
  }
}

/** An order is billed once; a second bill for it would be a second invoice number. */
export class OrderAlreadyBilledError extends Error {
  readonly code = 'ORDER_ALREADY_BILLED';
  override readonly name = 'OrderAlreadyBilledError';

  constructor(readonly orderId: string) {
    super(`order ${orderId} already has an invoice`);
  }
}

export class InvoiceNotFoundError extends Error {
  readonly code = 'INVOICE_NOT_FOUND';
  override readonly name = 'InvoiceNotFoundError';

  constructor(readonly invoiceId: string) {
    super(`invoice ${invoiceId} is not on this device`);
  }
}
