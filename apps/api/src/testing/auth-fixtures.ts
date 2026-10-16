// Sign-in fixtures for integration tests: an owner seeded as the superuser with
// a real Argon2id hash, a clock the test moves, and a mail transport that keeps
// what it was asked to send.
import { randomInt, randomUUID } from 'node:crypto';

import type pg from 'pg';

import { Argon2PasswordHasher } from '../modules/auth/postgres/argon2-password-hasher.js';
import type { Clock } from '../platform/clock.js';
import type { MailMessage, MailTransport } from '../platform/mail/mail-transport.js';
import type { TenantFixture } from './test-app.js';

export interface OwnerFixture {
  userId: string;
  email: string;
  phone: string;
  password: string;
}

let seq = 0;

// An owner of the given outlets (both of the tenant's by default).
export async function createOwner(
  superuser: pg.Client,
  tenant: TenantFixture,
  outletIds: readonly string[] = tenant.outletIds,
): Promise<OwnerFixture> {
  seq += 1;
  const owner = {
    userId: randomUUID(),
    email: `owner${String(seq)}-${randomUUID().slice(0, 8)}@chai.example`,
    phone: `9${String(randomInt(0, 1_000_000_000)).padStart(9, '0')}`,
    password: `masala-chai-${String(seq)}`,
  };
  await superuser.query(
    `INSERT INTO users (id, tenant_id, name, email, phone, password_hash)
     VALUES ($1, $2, 'Asha', $3, $4, $5)`,
    [
      owner.userId,
      tenant.tenantId,
      owner.email,
      owner.phone,
      await new Argon2PasswordHasher().hash(owner.password),
    ],
  );
  for (const outletId of outletIds) {
    await superuser.query(
      `INSERT INTO user_outlet_roles (id, tenant_id, user_id, outlet_id, role)
       VALUES ($1, $2, $3, $4, 'owner')`,
      [randomUUID(), tenant.tenantId, owner.userId, outletId],
    );
  }
  return owner;
}

// The real time unless a test sets one; `advance` moves a set time on.
export class TestClock implements Clock {
  private at: Date | null = null;

  now(): Date {
    return this.at ?? new Date();
  }

  set(at: Date): void {
    this.at = at;
  }

  advance(ms: number): void {
    this.at = new Date(this.now().getTime() + ms);
  }

  reset(): void {
    this.at = null;
  }
}

export class RecordingMailTransport implements MailTransport {
  readonly sent: MailMessage[] = [];

  send(message: MailMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }

  // The six-digit code in the last message sent to this address.
  codeFor(to: string): string | undefined {
    const message = this.sent.filter((m) => m.to === to).at(-1);
    return /\b(\d{6})\b/.exec(message?.text ?? '')?.[1];
  }
}

// The refresh cookie's value from a response's Set-Cookie header.
export function refreshCookieFrom(setCookie: string[] | string | undefined): string | undefined {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const line = cookies.find((c) => c.startsWith('bhojnalya_rt='));
  return line?.split(';')[0]?.slice('bhojnalya_rt='.length) || undefined;
}
