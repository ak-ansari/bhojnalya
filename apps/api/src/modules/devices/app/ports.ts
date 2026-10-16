// What device registration needs from storage, inside the request's tenant
// transaction. The Postgres adapter implements it.
import type { DeviceRole } from '@bhojnalya/contracts';
import type { Tx } from '@bhojnalya/db';

export interface DeviceRecord {
  id: string;
  outletId: string;
  deviceCode: string;
  role: DeviceRole;
  name: string | null;
  createdAt: Date;
  lastSeenAt: Date | null;
  revokedAt: Date | null;
  retiredAt: Date | null;
  retiredLastInvoiceNo: string | null;
  replacedByDeviceId: string | null;
}

export interface NewDevice {
  id: string;
  tenantId: string;
  outletId: string;
  deviceCode: string;
  role: DeviceRole;
  name: string | null;
  tokenHash: string;
  registeredByUserId: string | null;
}

export interface AuditEntry {
  tenantId: string;
  outletId: string;
  actorUserId: string | null;
  action: 'device.registered' | 'device.retired' | 'device.revoked';
  deviceId: string;
  after: Record<string, unknown>;
  requestId: string;
}

export interface DeviceRepository {
  // Locks the outlet row until the transaction ends, so code allocation in one
  // outlet is one at a time. Null when the outlet is not visible.
  lockOutlet(outletId: string): Promise<{ invoicePrefix: string } | null>;
  invoicePrefix(outletId: string): Promise<string | null>;
  codesInOutlet(outletId: string): Promise<string[]>;
  find(id: string): Promise<DeviceRecord | null>;
  // Null when the id is already taken, by this or any other device.
  insert(device: NewDevice): Promise<DeviceRecord | null>;
  retire(
    id: string,
    retirement: { at: Date; lastInvoiceNo: string | null; replacedBy: string },
  ): Promise<void>;
  revoke(id: string, at: Date): Promise<void>;
  // The newest invoice number synced from the device, across financial years.
  lastSyncedInvoiceNo(deviceId: string): Promise<string | null>;
  list(outletId: string, after: string | undefined, limit: number): Promise<DeviceRecord[]>;
  audit(entry: AuditEntry): Promise<void>;
}

export const DEVICE_REPOSITORY = Symbol('DEVICE_REPOSITORY');
export type DeviceRepositoryFor = (tx: Tx) => DeviceRepository;
