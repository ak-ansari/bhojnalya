// Emergency export of what has not synced (TRD §8.2): the outbox as JSON (the
// exact ops, so they can be pushed by hand) and as CSV (one row per op, for
// a person to read). Amounts stay paise digits, as on the wire.
import type { OutboxRecord } from '@/libs/local-db/db';

export interface OutboxExport {
  deviceId: string | null;
  exportedAt: string;
  ops: OutboxRecord[];
}

export function outboxToJson(exported: OutboxExport): string {
  return JSON.stringify(exported, null, 2);
}

export const CSV_COLUMNS = [
  'deviceSeq',
  'opId',
  'type',
  'entityId',
  'createdAt',
  'invoiceNo',
  'amountPaise',
  'status',
  'reason',
] as const;

export function outboxToCsv(records: readonly OutboxRecord[]): string {
  const rows = records.map((record) => {
    const { op } = record;
    const invoiceNo = op.type === 'invoice.create' ? op.payload.invoiceNo : '';
    const amount =
      op.type === 'invoice.create'
        ? op.payload.totals.grandTotal
        : op.type === 'payment.create'
          ? op.payload.amount
          : '';
    return [
      String(record.deviceSeq),
      op.opId,
      op.type,
      op.entityId,
      op.createdAt,
      invoiceNo,
      amount,
      record.rejection ? 'refused' : 'pending',
      record.rejection?.reason ?? '',
    ];
  });
  return [CSV_COLUMNS, ...rows].map((row) => row.map(csvField).join(',')).join('\r\n') + '\r\n';
}

/** Hands a text file to the browser to save. */
export function downloadText(fileName: string, mimeType: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
