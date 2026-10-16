// Registering, re-provisioning, listing and revoking tills and kitchen screens
// (TRD §7, §13). Runs in the request's tenant transaction. A device gets the
// outlet's next unused code and a long-lived token kept only as a hash.
import type {
  CurrentDevice,
  Device,
  DeviceList,
  DeviceListQuery,
  RegisterDeviceRequest,
  RegisteredDevice,
} from '@bhojnalya/contracts';
import type { Tx } from '@bhojnalya/db';
import { Inject, Injectable } from '@nestjs/common';

import { can } from '../../../platform/auth/permissions.js';
import {
  DEVICE_TOKEN_PREFIX,
  hashOpaqueToken,
  newOpaqueToken,
} from '../../../platform/auth/secrets.js';
import { CLOCK } from '../../../platform/clock.js';
import type { Clock } from '../../../platform/clock.js';
import { ApiError } from '../../../platform/errors/api-error.js';
import type { Principal } from '../../../platform/http/api-request.js';
import { nextDeviceCode } from '../domain/device-code.js';
import { DEVICE_REPOSITORY } from './ports.js';
import type { DeviceRecord, DeviceRepository, DeviceRepositoryFor } from './ports.js';

@Injectable()
export class DevicesService {
  constructor(
    @Inject(DEVICE_REPOSITORY) private readonly repositoryFor: DeviceRepositoryFor,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // With `replacesDeviceId`, the old device is retired in the same transaction,
  // recording the last invoice number synced from it (TRD §7).
  async register(
    tx: Tx,
    principal: Principal,
    request: RegisterDeviceRequest,
    requestId: string,
  ): Promise<RegisteredDevice> {
    const { outletId } = request;
    assertManages(principal, outletId);
    const devices = this.repositoryFor(tx);
    const outlet = await devices.lockOutlet(outletId);
    if (!outlet) throw notFound('outlet');
    const replaced = request.replacesDeviceId
      ? await this.replaceable(devices, request.replacesDeviceId, outletId)
      : null;
    const deviceCode = nextDeviceCode(await devices.codesInOutlet(outletId));
    if (deviceCode === null) {
      throw new ApiError(
        409,
        'DEVICE_CODES_EXHAUSTED',
        'This outlet has used every device code. Contact support.',
      );
    }
    const deviceToken = newOpaqueToken(DEVICE_TOKEN_PREFIX);
    const device = await devices.insert({
      id: request.id,
      tenantId: principal.tenantId,
      outletId,
      deviceCode,
      role: request.role,
      name: request.name ?? null,
      tokenHash: hashOpaqueToken(deviceToken),
      registeredByUserId: principal.userId ?? null,
    });
    // A retry of a registration whose answer was lost: the token is not kept,
    // so the device must be registered again, replacing this id.
    if (!device) {
      throw ApiError.conflict('A device with this id is already registered.', {
        deviceId: request.id,
      });
    }
    const audit = {
      tenantId: principal.tenantId,
      outletId,
      actorUserId: principal.userId ?? null,
      requestId,
    };
    await devices.audit({
      ...audit,
      action: 'device.registered',
      deviceId: device.id,
      after: { deviceCode, role: device.role, replacesDeviceId: replaced?.id ?? null },
    });
    if (replaced) {
      const lastInvoiceNo = await devices.lastSyncedInvoiceNo(replaced.id);
      await devices.retire(replaced.id, {
        at: this.clock.now(),
        lastInvoiceNo,
        replacedBy: device.id,
      });
      await devices.audit({
        ...audit,
        action: 'device.retired',
        deviceId: replaced.id,
        after: { deviceCode: replaced.deviceCode, lastInvoiceNo, replacedByDeviceId: device.id },
      });
    }
    return { device: toWire(device), deviceToken, invoicePrefix: outlet.invoicePrefix };
  }

  async list(tx: Tx, principal: Principal, query: DeviceListQuery): Promise<DeviceList> {
    assertManages(principal, query.outletId);
    const rows = await this.repositoryFor(tx).list(query.outletId, query.cursor, query.limit + 1);
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      items: page.map(toWire),
      nextCursor: rows.length > query.limit && last ? last.deviceCode : null,
    };
  }

  // The token stops working on the next request. The code stays taken; the
  // device is retired, and its last invoice number recorded, when it is replaced.
  async revoke(tx: Tx, principal: Principal, deviceId: string, requestId: string): Promise<void> {
    const devices = this.repositoryFor(tx);
    const device = await devices.find(deviceId);
    if (!device) throw notFound('device');
    assertManages(principal, device.outletId);
    if (device.revokedAt !== null) return;
    await devices.revoke(device.id, this.clock.now());
    await devices.audit({
      tenantId: principal.tenantId,
      outletId: device.outletId,
      actorUserId: principal.userId ?? null,
      action: 'device.revoked',
      deviceId: device.id,
      after: { deviceCode: device.deviceCode },
      requestId,
    });
  }

  async current(tx: Tx, principal: Principal): Promise<CurrentDevice> {
    const devices = this.repositoryFor(tx);
    const device = principal.deviceId ? await devices.find(principal.deviceId) : null;
    if (!device) throw notFound('device');
    const invoicePrefix = (await devices.invoicePrefix(device.outletId)) ?? '';
    return { device: toWire(device), invoicePrefix };
  }

  private async replaceable(
    devices: DeviceRepository,
    id: string,
    outletId: string,
  ): Promise<DeviceRecord> {
    const old = await devices.find(id);
    if (old?.outletId !== outletId) throw notFound('device to replace');
    if (old.retiredAt !== null) {
      throw ApiError.conflict('That device was already replaced.', { deviceId: id });
    }
    return old;
  }
}

function assertManages(principal: Principal, outletId: string): void {
  if (!can(principal, 'devices.manage', outletId)) {
    throw ApiError.forbidden('You cannot manage devices for this outlet.');
  }
}

function notFound(what: string): ApiError {
  return new ApiError(404, 'NOT_FOUND', `No such ${what}.`);
}

function toWire(device: DeviceRecord): Device {
  return {
    ...device,
    createdAt: device.createdAt.toISOString(),
    lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
    revokedAt: device.revokedAt?.toISOString() ?? null,
    retiredAt: device.retiredAt?.toISOString() ?? null,
  };
}
