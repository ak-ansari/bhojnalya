// POS and KDS devices: registration, re-provisioning and revocation (TRD §7, §13).
import { Module } from '@nestjs/common';

import { DevicesService } from './app/devices.service.js';
import { DEVICE_REPOSITORY } from './app/ports.js';
import { DevicesController } from './http/devices.controller.js';
import { pgDeviceRepository } from './postgres/device-repository.js';

@Module({
  controllers: [DevicesController],
  providers: [DevicesService, { provide: DEVICE_REPOSITORY, useValue: pgDeviceRepository }],
})
export class DevicesModule {}
