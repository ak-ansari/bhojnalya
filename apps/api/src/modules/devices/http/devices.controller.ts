// /api/v1/devices: an owner registers, lists and revokes tills and kitchen
// screens; a device reads itself (TRD §13).
import {
  CurrentDevice,
  DeviceList,
  DeviceListQuery,
  RegisterDeviceRequest,
  RegisteredDevice,
} from '@bhojnalya/contracts';
import type { Tx } from '@bhojnalya/db';
import { Controller, Delete, Get, HttpCode, Inject, Post, Req } from '@nestjs/common';
import { z } from 'zod';

import {
  CurrentPrincipal,
  DeviceOnly,
  RequirePermission,
} from '../../../platform/auth/auth.decorators.js';
import type { ApiRequest, Principal } from '../../../platform/http/api-request.js';
import { requestIdOf } from '../../../platform/http/api-request.js';
import { ResponseHoldsSecret } from '../../../platform/idempotency/idempotency.interceptor.js';
import { TenantTx } from '../../../platform/tenancy/tenant-transaction.interceptor.js';
import { Returns, ZodBody, ZodParams, ZodQuery } from '../../../platform/validation/zod.js';
import { DevicesService } from '../app/devices.service.js';

const DeviceIdParams = z.object({ id: z.uuid() });

@Controller('devices')
export class DevicesController {
  constructor(@Inject(DevicesService) private readonly devices: DevicesService) {}

  @Post()
  @HttpCode(201)
  @RequirePermission('devices.manage')
  @ResponseHoldsSecret()
  @Returns(201, 'Registered; the device token is shown only this once', RegisteredDevice)
  @Returns(409, 'The id is taken, the device to replace was already replaced, or codes ran out')
  register(
    @TenantTx() tx: Tx,
    @CurrentPrincipal() principal: Principal,
    @Req() req: ApiRequest,
    @ZodBody(RegisterDeviceRequest) body: RegisterDeviceRequest,
  ): Promise<RegisteredDevice> {
    return this.devices.register(tx, principal, body, requestIdOf(req));
  }

  @Get()
  @RequirePermission('devices.manage')
  @Returns(200, "The outlet's devices by code, retired and revoked ones included", DeviceList)
  list(
    @TenantTx() tx: Tx,
    @CurrentPrincipal() principal: Principal,
    @ZodQuery(DeviceListQuery) query: DeviceListQuery,
  ): Promise<DeviceList> {
    return this.devices.list(tx, principal, query);
  }

  @Get('me')
  @DeviceOnly()
  @Returns(200, 'The device that holds this token', CurrentDevice)
  me(@TenantTx() tx: Tx, @CurrentPrincipal() principal: Principal): Promise<CurrentDevice> {
    return this.devices.current(tx, principal);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('devices.manage')
  @Returns(204, "Revoked: the device's token is refused from now on")
  async revoke(
    @TenantTx() tx: Tx,
    @CurrentPrincipal() principal: Principal,
    @Req() req: ApiRequest,
    @ZodParams(DeviceIdParams) params: z.infer<typeof DeviceIdParams>,
  ): Promise<void> {
    await this.devices.revoke(tx, principal, params.id, requestIdOf(req));
  }
}
