// Sign-in, token refresh, password reset and device registration (TRD §13).
// Request and response bodies are camelCase; the access token's claims are the
// JWT's own snake_case, because they are read off the token, not off a body.
import { z } from 'zod';

import { DeviceRole, OutletRole } from './enums.js';
import { Uuidv7 } from './ids.js';
import { IsoInstant } from './sync-ops.js';

const Uuid = z.uuid();

/** An owner signs in with an email (any case) or a phone number, and a password. */
export const LoginRequest = z.object({
  login: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(128),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

/** A new password: long enough to resist guessing, short enough to hash cheaply. */
export const NewPassword = z.string().min(8).max(128);

/** What sign-in and refresh return. The refresh token travels only as an httpOnly cookie. */
export const AuthSession = z.object({
  accessToken: z.string().min(1),
  accessTokenExpiresAt: IsoInstant,
  user: z.object({
    id: Uuid,
    tenantId: Uuid,
    name: z.string(),
    email: z.string(),
  }),
  /** Every outlet the user may act for, with the role held there. */
  outlets: z.array(z.object({ outletId: Uuid, role: OutletRole })),
});
export type AuthSession = z.infer<typeof AuthSession>;

/** Step 1 of a reset: always answered the same way, whether or not the email is known. */
export const PasswordResetRequest = z.object({ email: z.email().max(254) });
export type PasswordResetRequest = z.infer<typeof PasswordResetRequest>;

/** Step 2 of a reset: the six-digit code from the email and the new password. */
export const PasswordResetConfirm = z.object({
  email: z.email().max(254),
  code: z.string().regex(/^\d{6}$/, 'must be the six-digit code'),
  newPassword: NewPassword,
});
export type PasswordResetConfirm = z.infer<typeof PasswordResetConfirm>;

/**
 * The claims of an access token. `scope` is `tenant` for an owner or staff
 * member; ticket 14 adds `platform`. `impersonated_by` is set only on a super
 * admin's view-as token. Clients decode it for display only; the API verifies it.
 */
export const AccessClaims = z.object({
  sub: z.string().min(1),
  scope: z.enum(['tenant', 'platform']),
  tenant_id: Uuid.optional(),
  impersonated_by: z.string().min(1).optional(),
  iat: z.number().int(),
  exp: z.number().int(),
});
export type AccessClaims = z.infer<typeof AccessClaims>;

/** A device's code: two base36 characters, the {DD} of its invoice numbers (TRD §7). */
export const DeviceCode = z.string().regex(/^[0-9A-Z]{2}$/, 'must be two characters 0-9 or A-Z');

/**
 * Register a till or kitchen screen. `id` is made on the device. A device that
 * lost its storage is registered again with `replacesDeviceId`, which retires
 * the old code for good.
 */
export const RegisterDeviceRequest = z.object({
  id: Uuidv7,
  outletId: Uuid,
  role: DeviceRole,
  name: z.string().trim().min(1).max(60).optional(),
  replacesDeviceId: Uuid.optional(),
});
export type RegisterDeviceRequest = z.infer<typeof RegisterDeviceRequest>;

export const Device = z.object({
  id: Uuid,
  outletId: Uuid,
  deviceCode: DeviceCode,
  role: DeviceRole,
  name: z.string().nullable(),
  createdAt: IsoInstant,
  lastSeenAt: IsoInstant.nullable(),
  revokedAt: IsoInstant.nullable(),
  retiredAt: IsoInstant.nullable(),
  /** The last invoice number synced from this device before it was retired. */
  retiredLastInvoiceNo: z.string().nullable(),
  replacedByDeviceId: Uuid.nullable(),
});
export type Device = z.infer<typeof Device>;

/** Returned once: the token is never shown again and the server keeps only its hash. */
export const RegisteredDevice = z.object({
  device: Device,
  deviceToken: z.string().min(1),
  /** {PP} of this outlet's invoice numbers, so the till can number offline. */
  invoicePrefix: z.string().regex(/^[0-9A-Z]{2}$/),
});
export type RegisteredDevice = z.infer<typeof RegisteredDevice>;

export const DeviceListQuery = z.object({
  outletId: Uuid,
  cursor: DeviceCode.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type DeviceListQuery = z.infer<typeof DeviceListQuery>;

export const DeviceList = z.object({
  items: z.array(Device),
  /** Pass back as `cursor` for the next page; null on the last page. */
  nextCursor: DeviceCode.nullable(),
});
export type DeviceList = z.infer<typeof DeviceList>;

/** What a device learns about itself from its own token. */
export const CurrentDevice = z.object({ device: Device, invoicePrefix: z.string() });
export type CurrentDevice = z.infer<typeof CurrentDevice>;
