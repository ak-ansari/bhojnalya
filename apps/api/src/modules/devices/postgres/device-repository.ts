// DeviceRepository on the request's tenant transaction, as app_user under RLS.
import { newId } from '@bhojnalya/contracts';
import { auditLog, deviceInvoiceCounters, devices, outlets } from '@bhojnalya/db';
import type { Tx } from '@bhojnalya/db';
import { and, asc, desc, eq, gt, sql } from 'drizzle-orm';

import type { AuditEntry, DeviceRecord, DeviceRepository, NewDevice } from '../app/ports.js';

export function pgDeviceRepository(tx: Tx): DeviceRepository {
  return new PgDeviceRepository(tx);
}

const RECORD = {
  id: devices.id,
  outletId: devices.outletId,
  deviceCode: devices.deviceCode,
  role: devices.role,
  name: devices.name,
  createdAt: devices.createdAt,
  lastSeenAt: devices.lastSeenAt,
  revokedAt: devices.revokedAt,
  retiredAt: devices.retiredAt,
  retiredLastInvoiceNo: devices.retiredLastInvoiceNo,
  replacedByDeviceId: devices.replacedByDeviceId,
};

class PgDeviceRepository implements DeviceRepository {
  constructor(private readonly tx: Tx) {}

  // NO KEY UPDATE: serialises registrations in the outlet without blocking
  // rows elsewhere that reference the outlet.
  async lockOutlet(outletId: string): Promise<{ invoicePrefix: string } | null> {
    const [row] = await this.tx
      .select({ invoicePrefix: outlets.invoicePrefix })
      .from(outlets)
      .where(eq(outlets.id, outletId))
      .for('no key update');
    return row ?? null;
  }

  async invoicePrefix(outletId: string): Promise<string | null> {
    const [row] = await this.tx
      .select({ invoicePrefix: outlets.invoicePrefix })
      .from(outlets)
      .where(eq(outlets.id, outletId));
    return row?.invoicePrefix ?? null;
  }

  async codesInOutlet(outletId: string): Promise<string[]> {
    const rows = await this.tx
      .select({ deviceCode: devices.deviceCode })
      .from(devices)
      .where(eq(devices.outletId, outletId));
    return rows.map((r) => r.deviceCode);
  }

  async find(id: string): Promise<DeviceRecord | null> {
    const [row] = await this.tx.select(RECORD).from(devices).where(eq(devices.id, id));
    return row ?? null;
  }

  async insert(device: NewDevice): Promise<DeviceRecord | null> {
    const [row] = await this.tx
      .insert(devices)
      .values(device)
      .onConflictDoNothing({ target: devices.id })
      .returning(RECORD);
    return row ?? null;
  }

  async retire(
    id: string,
    {
      at,
      lastInvoiceNo,
      replacedBy,
    }: { at: Date; lastInvoiceNo: string | null; replacedBy: string },
  ): Promise<void> {
    await this.tx
      .update(devices)
      .set({
        retiredAt: at,
        revokedAt: sql`coalesce(${devices.revokedAt}, ${at.toISOString()}::timestamptz)`,
        retiredLastInvoiceNo: lastInvoiceNo,
        replacedByDeviceId: replacedBy,
      })
      .where(eq(devices.id, id));
  }

  async revoke(id: string, at: Date): Promise<void> {
    await this.tx.update(devices).set({ revokedAt: at }).where(eq(devices.id, id));
  }

  async lastSyncedInvoiceNo(deviceId: string): Promise<string | null> {
    const [row] = await this.tx
      .select({ lastInvoiceNo: deviceInvoiceCounters.lastInvoiceNo })
      .from(deviceInvoiceCounters)
      .where(eq(deviceInvoiceCounters.deviceId, deviceId))
      .orderBy(desc(deviceInvoiceCounters.fy))
      .limit(1);
    return row?.lastInvoiceNo ?? null;
  }

  list(outletId: string, after: string | undefined, limit: number): Promise<DeviceRecord[]> {
    return this.tx
      .select(RECORD)
      .from(devices)
      .where(
        and(
          eq(devices.outletId, outletId),
          after === undefined ? undefined : gt(devices.deviceCode, after),
        ),
      )
      .orderBy(asc(devices.deviceCode))
      .limit(limit);
  }

  async audit(entry: AuditEntry): Promise<void> {
    await this.tx.insert(auditLog).values({
      id: newId(),
      tenantId: entry.tenantId,
      outletId: entry.outletId,
      actorType: entry.actorUserId === null ? 'system' : 'user',
      actorUserId: entry.actorUserId,
      action: entry.action,
      entityType: 'device',
      entityId: entry.deviceId,
      after: entry.after,
      requestId: entry.requestId,
    });
  }
}
