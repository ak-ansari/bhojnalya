// Tenant isolation over every tenant table, found in the catalogue rather than
// listed by hand, so a table added later is covered without touching this file
// (TRD §5.2, ADR 0005). Every assertion runs as app_user; the superuser only
// seeds one row per tenant (and per outlet) into each table.
import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

// Tables that are keyed by tenant but are not tenant tables themselves.
const TENANT_ROOT = 'tenants';
// Tables that belong to no tenant. Each must still deny app_user entirely.
const PLATFORM_TABLES = ['platform_admins'];
// Tables with an outlet_id that are deliberately tenant-wide: roles are read at
// login before the outlets are known, and the audit log has tenant-level rows.
const TENANT_WIDE_WITH_OUTLET = ['user_outlet_roles', 'audit_log'];

const RLS_OR_GRANT_DENIED = /row-level security|permission denied/;

interface Column {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
  character_maximum_length: number | null;
  is_generated: string;
  is_identity: 'YES' | 'NO';
}

interface TenantTable {
  name: string;
  columns: Column[];
  outletScoped: boolean;
}

const A = randomUUID();
const B = randomUUID();
const A1 = randomUUID();
const A2 = randomUUID();
const B1 = randomUUID();

let superuser: pg.Client;
let app: pg.Pool;
let allTables: string[];
let tenantTables: TenantTable[];

beforeAll(async () => {
  const urls = inject('databaseUrls');
  superuser = new pg.Client({ connectionString: urls.superuser });
  await superuser.connect();
  app = new pg.Pool({ connectionString: urls.app, max: 2 });

  const columns = await discoverColumns();
  allTables = [...new Set(columns.map((c) => c.table_name))];
  tenantTables = allTables
    .map((name) => {
      const own = columns.filter((c) => c.table_name === name);
      const hasOutlet = own.some((c) => c.column_name === 'outlet_id');
      return {
        name,
        columns: own,
        outletScoped: hasOutlet && !TENANT_WIDE_WITH_OUTLET.includes(name),
      };
    })
    .filter((t) => t.columns.some((c) => c.column_name === 'tenant_id'));

  await seed();
});

afterAll(async () => {
  await superuser.end();
  await app.end();
});

describe('tenant isolation (every tenant table)', () => {
  it('connects as a role that can neither bypass RLS nor own a table', async () => {
    const { rows } = await app.query<{
      current_user: string;
      rolsuper: boolean;
      rolbypassrls: boolean;
      owned: string;
    }>(
      `SELECT current_user, r.rolsuper, r.rolbypassrls,
              (SELECT count(*) FROM pg_class c WHERE c.relowner = r.oid) AS owned
         FROM pg_roles r WHERE r.rolname = current_user`,
    );
    expect(rows).toEqual([
      { current_user: 'app_user', rolsuper: false, rolbypassrls: false, owned: '0' },
    ]);
  });

  it('finds the tenant tables in the catalogue and leaves no table unclassified', () => {
    const unclassified = allTables.filter(
      (name) =>
        name !== TENANT_ROOT &&
        !PLATFORM_TABLES.includes(name) &&
        !tenantTables.some((t) => t.name === name),
    );
    expect(unclassified).toEqual([]);
    expect(tenantTables.map((t) => t.name)).toEqual(
      expect.arrayContaining(['outlets', 'floors', 'tables', 'users', 'devices', 'audit_log']),
    );
  });

  it('has row-level security enabled and forced on every tenant and platform table', async () => {
    const names = [TENANT_ROOT, ...PLATFORM_TABLES, ...tenantTables.map((t) => t.name)];
    const { rows } = await app.query<{ relname: string }>(
      `SELECT relname FROM pg_class
        WHERE relnamespace = 'public'::regnamespace AND relname = ANY($1)
          AND relrowsecurity AND relforcerowsecurity`,
      [names],
    );
    expect(names.filter((n) => !rows.some((r) => r.relname === n))).toEqual([]);
  });

  it('shows no tenant row to a query made without a tenant context', async () => {
    const leaks: string[] = [];
    for (const name of [TENANT_ROOT, ...tenantTables.map((t) => t.name)]) {
      const count = await inContext(null, async (c) => {
        if (!(await hasPrivilege(c, name, 'SELECT'))) return 0;
        return countRows(c, `SELECT count(*) FROM ${ident(name)}`);
      });
      if (count !== 0) leaks.push(`${name}: ${String(count)} rows`);
    }
    expect(leaks).toEqual([]);
  });

  it("returns none of tenant B's rows to a read under tenant A's context", async () => {
    const failures: string[] = [];
    for (const t of tenantTables) {
      await inContext({ tenantId: A, outletIds: [A1, A2] }, async (c) => {
        if (!(await hasPrivilege(c, t.name, 'SELECT'))) return;
        const others = await countRows(
          c,
          `SELECT count(*) FROM ${ident(t.name)} WHERE tenant_id = $1`,
          [B],
        );
        const own = await countRows(
          c,
          `SELECT count(*) FROM ${ident(t.name)} WHERE tenant_id = $1`,
          [A],
        );
        if (others !== 0) failures.push(`${t.name}: sees ${String(others)} of tenant B's rows`);
        // Proves the context is in force, so "none of B's" is not "none at all".
        if (own === 0) failures.push(`${t.name}: sees none of tenant A's own rows`);
      });
    }
    expect(failures).toEqual([]);
  });

  it("rejects a write carrying tenant B's id under tenant A's context", async () => {
    const failures: string[] = [];
    for (const t of tenantTables) {
      await inContext({ tenantId: A, outletIds: [A1, A2] }, async (c) => {
        const cols = t.columns.some((col) => col.column_name === 'outlet_id')
          ? ['tenant_id', 'outlet_id']
          : ['tenant_id'];
        const insert = await attempt(
          c,
          `INSERT INTO ${ident(t.name)} (${cols.map(ident).join(', ')}) VALUES (${cols.map((_, i) => `$${String(i + 1)}`).join(', ')})`,
          [B, B1].slice(0, cols.length),
        );
        if (!RLS_OR_GRANT_DENIED.test(insert.error ?? ''))
          failures.push(`${t.name}: insert as tenant B → ${insert.error ?? 'accepted'}`);

        const move = await attempt(
          c,
          `UPDATE ${ident(t.name)} SET tenant_id = $1 WHERE tenant_id = $2`,
          [B, A],
        );
        if (!RLS_OR_GRANT_DENIED.test(move.error ?? ''))
          failures.push(
            `${t.name}: moving A's row to B → ${move.error ?? `${String(move.rowCount)} rows moved`}`,
          );

        const touch = await attempt(
          c,
          `UPDATE ${ident(t.name)} SET tenant_id = tenant_id WHERE tenant_id = $1`,
          [B],
        );
        if (touch.error === undefined && touch.rowCount !== 0)
          failures.push(`${t.name}: updated ${String(touch.rowCount)} of tenant B's rows`);

        const remove = await attempt(c, `DELETE FROM ${ident(t.name)} WHERE tenant_id = $1`, [B]);
        if (remove.error === undefined && remove.rowCount !== 0)
          failures.push(`${t.name}: deleted ${String(remove.rowCount)} of tenant B's rows`);
      });
    }
    expect(failures).toEqual([]);
  });

  it("hides outlet A2's rows from, and refuses them to, a context holding only outlet A1", async () => {
    const outletTables = tenantTables.filter((t) => t.outletScoped);
    expect(outletTables.map((t) => t.name)).toEqual(expect.arrayContaining(['floors', 'devices']));
    const failures: string[] = [];
    for (const t of outletTables) {
      await inContext({ tenantId: A, outletIds: [A1] }, async (c) => {
        if (await hasPrivilege(c, t.name, 'SELECT')) {
          const other = await countRows(
            c,
            `SELECT count(*) FROM ${ident(t.name)} WHERE outlet_id = $1`,
            [A2],
          );
          const own = await countRows(
            c,
            `SELECT count(*) FROM ${ident(t.name)} WHERE outlet_id = $1`,
            [A1],
          );
          if (other !== 0) failures.push(`${t.name}: sees ${String(other)} of outlet A2's rows`);
          if (own === 0) failures.push(`${t.name}: sees none of outlet A1's own rows`);
        }
        const insert = await attempt(
          c,
          `INSERT INTO ${ident(t.name)} (tenant_id, outlet_id) VALUES ($1, $2)`,
          [A, A2],
        );
        if (!RLS_OR_GRANT_DENIED.test(insert.error ?? ''))
          failures.push(`${t.name}: insert into outlet A2 → ${insert.error ?? 'accepted'}`);
      });
    }
    expect(failures).toEqual([]);
  });

  it("shows tenant A only its own tenant row and changes none of tenant B's", async () => {
    await inContext({ tenantId: A, outletIds: [] }, async (c) => {
      const { rows } = await c.query<{ id: string }>('SELECT id FROM tenants');
      expect(rows.map((r) => r.id)).toEqual([A]);
      const touch = await attempt(c, "UPDATE tenants SET name = 'taken' WHERE id = $1", [B]);
      expect(touch).toEqual({ rowCount: 0 });
    });
  });

  it('denies app_user every platform table, whatever the context', async () => {
    for (const name of PLATFORM_TABLES) {
      await inContext({ tenantId: A, outletIds: [A1] }, async (c) => {
        const read = await attempt(c, `SELECT count(*) FROM ${ident(name)}`);
        expect(read.error).toMatch(/permission denied/);
      });
    }
  });
});

// --- context and statements, as app_user ------------------------------------

interface Context {
  tenantId: string;
  outletIds: string[];
}

// Runs fn in a transaction that is always rolled back, with the same two
// settings the application's tenant transaction sets (null: no context).
async function inContext<T>(ctx: Context | null, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await app.connect();
  try {
    await c.query('BEGIN');
    if (ctx) {
      await c.query(
        "SELECT set_config('app.tenant_id', $1, true), set_config('app.outlet_ids', $2, true)",
        [ctx.tenantId, ctx.outletIds.join(',')],
      );
    }
    return await fn(c);
  } finally {
    await c.query('ROLLBACK');
    c.release();
  }
}

interface Outcome {
  rowCount?: number | null;
  error?: string;
}

// One statement inside a savepoint, so a refusal does not abort the rest.
async function attempt(c: pg.PoolClient, text: string, values: unknown[] = []): Promise<Outcome> {
  await c.query('SAVEPOINT attempt');
  try {
    const result = await c.query(text, values);
    await c.query('RELEASE SAVEPOINT attempt');
    return { rowCount: result.rowCount };
  } catch (error) {
    await c.query('ROLLBACK TO SAVEPOINT attempt');
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

async function hasPrivilege(c: pg.PoolClient, table: string, privilege: string): Promise<boolean> {
  const { rows } = await c.query<{ ok: boolean }>(
    "SELECT has_table_privilege(current_user, 'public.' || quote_ident($1), $2) AS ok",
    [table, privilege],
  );
  return rows[0]?.ok === true;
}

async function countRows(c: pg.PoolClient, text: string, values: unknown[] = []): Promise<number> {
  const { rows } = await c.query<{ count: string }>(text, values);
  return Number(rows[0]?.count);
}

function ident(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

// --- discovery and seeding, as superuser ------------------------------------

async function discoverColumns(): Promise<Column[]> {
  const { rows } = await superuser.query<Column>(
    `SELECT c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable,
            c.column_default, c.character_maximum_length, c.is_generated, c.is_identity
       FROM information_schema.columns c
       JOIN information_schema.tables t
         ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name, c.ordinal_position`,
  );
  return rows;
}

// One row per tenant in every tenant table, and one per outlet in every
// outlet-scoped table, with made-up values for the required columns. Foreign
// keys are switched off for the seeding transaction only, so the rows need not
// form a consistent graph.
async function seed(): Promise<void> {
  await superuser.query('BEGIN');
  await superuser.query('SET LOCAL session_replication_role = replica');
  await superuser.query(
    "INSERT INTO tenants (id, name) VALUES ($1, 'Tenant A'), ($2, 'Tenant B')",
    [A, B],
  );
  const outlets = tenantTables.find((t) => t.name === 'outlets');
  if (!outlets) throw new Error('no outlets table');
  for (const [id, tenantId] of [
    [A1, A],
    [A2, A],
    [B1, B],
  ] as const) {
    await insertSynthetic(outlets, { id, tenant_id: tenantId });
  }
  for (const t of tenantTables.filter((x) => x.name !== 'outlets')) {
    const hasOutlet = t.columns.some((c) => c.column_name === 'outlet_id');
    const rows: Record<string, string>[] = hasOutlet
      ? [
          { tenant_id: A, outlet_id: A1 },
          ...(t.outletScoped ? [{ tenant_id: A, outlet_id: A2 }] : []),
          { tenant_id: B, outlet_id: B1 },
        ]
      : [{ tenant_id: A }, { tenant_id: B }];
    for (const fixed of rows) await insertSynthetic(t, fixed);
  }
  await superuser.query('COMMIT');
}

let counter = 0;

async function insertSynthetic(table: TenantTable, fixed: Record<string, string>): Promise<void> {
  const values: Record<string, unknown> = { ...fixed };
  for (const col of table.columns) {
    const required =
      col.is_nullable === 'NO' &&
      col.column_default === null &&
      col.is_generated === 'NEVER' &&
      col.is_identity === 'NO';
    if (required && !(col.column_name in values))
      values[col.column_name] = await syntheticValue(col);
  }
  const names = Object.keys(values);
  try {
    await superuser.query(
      `INSERT INTO ${ident(table.name)} (${names.map(ident).join(', ')}) VALUES (${names.map((_, i) => `$${String(i + 1)}`).join(', ')})`,
      Object.values(values),
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Seeding ${table.name} failed (${reason}). Teach syntheticValue in rls.int.test.ts the column's type or constraint.`,
    );
  }
}

// Digits for fixed-width text (codes like "27" or "0A" all accept digits),
// unique text elsewhere, the first label for an enum.
async function syntheticValue(col: Column): Promise<unknown> {
  counter += 1;
  if (col.data_type === 'USER-DEFINED') {
    const { rows } = await superuser.query<{ enumlabel: string }>(
      `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = $1 ORDER BY e.enumsortorder LIMIT 1`,
      [col.udt_name],
    );
    if (rows[0]) return rows[0].enumlabel;
  }
  if (col.data_type === 'ARRAY') return '{}';
  switch (col.udt_name) {
    case 'uuid':
      return randomUUID();
    case 'bpchar':
      return String(counter % 10 ** (col.character_maximum_length ?? 1)).padStart(
        col.character_maximum_length ?? 1,
        '0',
      );
    case 'text':
    case 'varchar':
      return `synthetic-${String(counter)}`;
    case 'int2':
    case 'int4':
    case 'int8':
    case 'numeric':
      return counter;
    case 'bool':
      return false;
    case 'timestamptz':
    case 'timestamp':
      return new Date().toISOString();
    case 'date':
      return '2026-04-01';
    case 'time':
      return '04:00';
    case 'json':
    case 'jsonb':
      return '{}';
    case 'bytea':
      return Buffer.from([counter % 256]);
    default:
      throw new Error(
        `no synthetic value for ${col.table_name}.${col.column_name} (${col.udt_name})`,
      );
  }
}
