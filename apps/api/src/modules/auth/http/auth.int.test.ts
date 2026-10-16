import { createHash } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { SignJWT } from 'jose';
import pg from 'pg';
import type TestAgent from 'supertest/lib/agent.js';
import { afterAll, afterEach, beforeAll, describe, expect, inject, it } from 'vitest';

import {
  RecordingMailTransport,
  TestClock,
  createOwner,
  refreshCookieFrom,
} from '../../../testing/auth-fixtures.js';
import type { OwnerFixture } from '../../../testing/auth-fixtures.js';
import { agentFor, createTenant, createTestApp } from '../../../testing/test-app.js';
import type { TenantFixture } from '../../../testing/test-app.js';

let app: INestApplication;
let logs: Record<string, unknown>[];
let http: TestAgent;
let superuser: pg.Client;
let tenant: TenantFixture;
const clock = new TestClock();
const mail = new RecordingMailTransport();

beforeAll(async () => {
  const urls = inject('databaseUrls');
  superuser = new pg.Client({ connectionString: urls.superuser });
  await superuser.connect();
  tenant = await createTenant(superuser);
  ({ app, logs } = await createTestApp(urls.app, { clock, mailTransport: mail }));
  http = agentFor(app);
});

afterEach(() => {
  clock.reset();
});

afterAll(async () => {
  await app.close();
  await superuser.end();
});

function login(owner: OwnerFixture, login = owner.email, password = owner.password) {
  return http.post('/api/v1/auth/login').send({ login, password });
}

function refresh(cookie: string | undefined) {
  const req = http.post('/api/v1/auth/refresh');
  return cookie === undefined ? req : req.set('Cookie', `bhojnalya_rt=${cookie}`);
}

function context(accessToken: string) {
  return http.get('/api/v1/probe/context').set('Authorization', `Bearer ${accessToken}`);
}

describe('POST /auth/login', () => {
  it('signs an owner in by email in any case, and the access token opens their tenant', async () => {
    const owner = await createOwner(superuser, tenant);
    const res = await login(owner, owner.email.toUpperCase());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      user: { id: owner.userId, tenantId: tenant.tenantId, name: 'Asha', email: owner.email },
      outlets: tenant.outletIds
        .map((outletId) => ({ outletId, role: 'owner' }))
        .sort((a, b) => a.outletId.localeCompare(b.outletId)),
    });
    const ctx = await context(res.body.accessToken as string);
    expect(ctx.status).toBe(200);
    expect(ctx.body).toMatchObject({ currentUser: 'app_user', tenantId: tenant.tenantId });
  });

  it('signs an owner in by phone', async () => {
    const owner = await createOwner(superuser, tenant);
    expect((await login(owner, owner.phone)).status).toBe(200);
  });

  it('sets the refresh token only as an httpOnly, Secure, SameSite=Strict cookie on the auth path', async () => {
    const owner = await createOwner(superuser, tenant);
    const res = await login(owner);
    const setCookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const line = setCookie.find((c) => c.startsWith('bhojnalya_rt='));
    expect(line).toMatch(/; Path=\/api\/v1\/auth/);
    expect(line).toMatch(/; HttpOnly/);
    expect(line).toMatch(/; Secure/);
    expect(line).toMatch(/; SameSite=Strict/);
    expect(line).toMatch(/; Max-Age=2592000/);
    const token = refreshCookieFrom(res.headers['set-cookie']);
    expect(JSON.stringify(res.body)).not.toContain(token);
    // Only its hash is stored.
    const { rows } = await superuser.query<{ token_hash: string }>(
      'SELECT token_hash FROM refresh_tokens WHERE user_id = $1',
      [owner.userId],
    );
    expect(rows).toEqual([
      {
        token_hash: createHash('sha256')
          .update(token ?? '')
          .digest('hex'),
      },
    ]);
  });

  it('answers a wrong password and an unknown login with the same 401 INVALID_CREDENTIALS', async () => {
    const owner = await createOwner(superuser, tenant);
    const wrong = await login(owner, owner.email, 'not-the-password');
    const unknown = await login(owner, 'nobody@chai.example', owner.password);
    for (const res of [wrong, unknown]) {
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        message: 'The email, phone or password is wrong.',
      });
      expect(res.headers['set-cookie']).toBeUndefined();
    }
  });

  it('refuses a disabled account with the same answer as a wrong password', async () => {
    const owner = await createOwner(superuser, tenant);
    await superuser.query("UPDATE users SET status = 'disabled' WHERE id = $1", [owner.userId]);
    const res = await login(owner);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('never writes the password or a token into the logs', async () => {
    const owner = await createOwner(superuser, tenant);
    const res = await login(owner);
    const token = refreshCookieFrom(res.headers['set-cookie']) ?? 'missing';
    const written = JSON.stringify(logs);
    expect(written).not.toContain(owner.password);
    expect(written).not.toContain(token);
    expect(written).not.toContain(res.body.accessToken as string);
  });
});

describe('access tokens', () => {
  it('stop working 15 minutes after they are issued', async () => {
    const owner = await createOwner(superuser, tenant);
    clock.set(new Date());
    const { body } = await login(owner);
    clock.advance(15 * 60 * 1000 - 1000);
    expect((await context(body.accessToken as string)).status).toBe(200);
    clock.advance(1000);
    const res = await context(body.accessToken as string);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('stop working on the next request once the account is disabled', async () => {
    const owner = await createOwner(superuser, tenant);
    const { body } = await login(owner);
    await superuser.query("UPDATE users SET status = 'disabled' WHERE id = $1", [owner.userId]);
    expect((await context(body.accessToken as string)).status).toBe(401);
  });

  it("reach only the outlet named in X-Outlet-Id, and refuse one that is not the user's", async () => {
    const owner = await createOwner(superuser, tenant);
    const other = await createTenant(superuser);
    const { body } = await login(owner);
    const token = body.accessToken as string;
    const both = await context(token);
    expect((both.body.outletIds as string).split(',').sort()).toEqual([...tenant.outletIds].sort());
    const one = await context(token).set('X-Outlet-Id', tenant.outletIds[1]);
    expect(one.body).toMatchObject({ outletIds: tenant.outletIds[1] });
    const foreign = await context(token).set('X-Outlet-Id', other.outletIds[0]);
    expect(foreign.status).toBe(403);
    expect(foreign.body).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('refuse a well-formed token for a real owner that this API did not sign', async () => {
    const owner = await createOwner(superuser, tenant);
    const now = Math.floor(Date.now() / 1000);
    const forged = await new SignJWT({ scope: 'tenant', tenant_id: tenant.tenantId })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(owner.userId)
      .setIssuer('bhojnalya-api')
      .setIssuedAt(now)
      .setExpirationTime(now + 600)
      .sign(new TextEncoder().encode('a-secret-that-is-not-the-servers-own'));
    const res = await context(forged);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: 'UNAUTHENTICATED' });
  });
});

describe('POST /auth/refresh', () => {
  it('replaces the refresh token with a new one and issues a new access token', async () => {
    const owner = await createOwner(superuser, tenant);
    const first = refreshCookieFrom((await login(owner)).headers['set-cookie']);
    const res = await refresh(first);
    expect(res.status).toBe(200);
    const second = refreshCookieFrom(res.headers['set-cookie']);
    expect(second).toBeDefined();
    expect(second).not.toBe(first);
    expect((await context(res.body.accessToken as string)).status).toBe(200);
    expect((await refresh(second)).status).toBe(200);
  });

  it('treats a used refresh token presented again as theft: 401, and the whole family is revoked', async () => {
    const owner = await createOwner(superuser, tenant);
    const first = refreshCookieFrom((await login(owner)).headers['set-cookie']);
    const second = refreshCookieFrom((await refresh(first)).headers['set-cookie']);

    const replayed = await refresh(first);
    expect(replayed.status).toBe(401);
    expect(replayed.body).toMatchObject({ code: 'UNAUTHENTICATED' });
    // The legitimate holder's newer token is gone too.
    expect((await refresh(second)).status).toBe(401);
    const { rows } = await superuser.query<{ open: number }>(
      'SELECT count(*)::int AS open FROM refresh_tokens WHERE user_id = $1 AND revoked_at IS NULL',
      [owner.userId],
    );
    expect(rows[0]?.open).toBe(0);
  });

  it('leaves other sign-ins of the same user alone when one family is revoked', async () => {
    const owner = await createOwner(superuser, tenant);
    const laptop = refreshCookieFrom((await login(owner)).headers['set-cookie']);
    const phone = refreshCookieFrom((await login(owner)).headers['set-cookie']);
    await refresh(laptop);
    await refresh(laptop);
    expect((await refresh(phone)).status).toBe(200);
  });

  it('refuses an expired refresh token, a missing one and a made-up one, clearing the cookie', async () => {
    const owner = await createOwner(superuser, tenant);
    const token = refreshCookieFrom((await login(owner)).headers['set-cookie']);
    await superuser.query(
      "UPDATE refresh_tokens SET expires_at = now() - interval '1 second' WHERE user_id = $1",
      [owner.userId],
    );
    for (const res of [await refresh(token), await refresh(undefined), await refresh('brt_nope')]) {
      expect(res.status).toBe(401);
      expect(([] as string[]).concat(res.headers['set-cookie'] ?? []).join()).toMatch(
        /bhojnalya_rt=;/,
      );
    }
  });
});

describe('POST /auth/logout', () => {
  it('revokes the refresh token so it cannot be refreshed again', async () => {
    const owner = await createOwner(superuser, tenant);
    const token = refreshCookieFrom((await login(owner)).headers['set-cookie']);
    const res = await http.post('/api/v1/auth/logout').set('Cookie', `bhojnalya_rt=${token ?? ''}`);
    expect(res.status).toBe(204);
    expect((await refresh(token)).status).toBe(401);
  });
});

describe('password reset by email code', () => {
  async function requestCode(owner: OwnerFixture): Promise<string> {
    const res = await http.post('/api/v1/auth/password-reset/request').send({ email: owner.email });
    expect(res.status).toBe(202);
    const code = mail.codeFor(owner.email);
    expect(code).toMatch(/^\d{6}$/);
    return code ?? '';
  }

  function confirm(owner: OwnerFixture, code: string, newPassword = 'cardamom-and-ginger') {
    return http
      .post('/api/v1/auth/password-reset/confirm')
      .send({ email: owner.email, code, newPassword });
  }

  it('sets the new password, retires the old one and signs out every session', async () => {
    const owner = await createOwner(superuser, tenant);
    const session = refreshCookieFrom((await login(owner)).headers['set-cookie']);
    const code = await requestCode(owner);

    expect((await confirm(owner, code)).status).toBe(204);
    expect((await login(owner)).status).toBe(401);
    expect((await login(owner, owner.email, 'cardamom-and-ginger')).status).toBe(200);
    expect((await refresh(session)).status).toBe(401);
    // A code works once.
    expect((await confirm(owner, code, 'another-password')).status).toBe(400);
  });

  it('answers an unknown email exactly as a known one, and sends nothing', async () => {
    const before = mail.sent.length;
    const res = await http
      .post('/api/v1/auth/password-reset/request')
      .send({ email: 'nobody@chai.example' });
    expect(res.status).toBe(202);
    expect(res.body).toEqual({});
    expect(mail.sent.length).toBe(before);
  });

  it('refuses a wrong code with 400 INVALID_RESET_CODE and spends the code after 5 wrong guesses', async () => {
    const owner = await createOwner(superuser, tenant);
    const code = await requestCode(owner);
    const wrong = code === '000000' ? '000001' : '000000';
    for (let i = 0; i < 5; i += 1) {
      const res = await confirm(owner, wrong);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ code: 'INVALID_RESET_CODE' });
    }
    expect((await confirm(owner, code)).status).toBe(400);
  });

  it('refuses a code 10 minutes after it was sent', async () => {
    const owner = await createOwner(superuser, tenant);
    clock.set(new Date());
    const code = await requestCode(owner);
    clock.advance(10 * 60 * 1000);
    expect((await confirm(owner, code)).status).toBe(400);
  });

  it('spends an older code when a newer one is sent', async () => {
    const owner = await createOwner(superuser, tenant);
    const older = await requestCode(owner);
    const newer = await requestCode(owner);
    if (older !== newer) expect((await confirm(owner, older)).status).toBe(400);
    expect((await confirm(owner, newer)).status).toBe(204);
  });

  it('keeps only a keyed hash of the code, and never logs it', async () => {
    const owner = await createOwner(superuser, tenant);
    const code = await requestCode(owner);
    const { rows } = await superuser.query<{ code_hash: string }>(
      'SELECT code_hash FROM password_reset_codes WHERE user_id = $1',
      [owner.userId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0]?.code_hash).not.toBe(createHash('sha256').update(code).digest('hex'));
    expect(JSON.stringify(logs)).not.toContain(`"${code}"`);
  });
});
