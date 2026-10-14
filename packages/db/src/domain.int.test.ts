// Rules Postgres keeps for the menu, ordering, kitchen, billing, aggregator
// and sync tables (TRD §5.3, §7, §8.3): financial records are append-only,
// numbers are unique where the TRD says so, an invoice's status is derived,
// and orders keep what they sold. Every assertion runs as app_user.
import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { createTenant } from './testing/fixtures.js';
import type { TenantFixture } from './testing/fixtures.js';

const FINANCIAL_TABLES = [
  'invoices',
  'invoice_lines',
  'invoice_tax_lines',
  'payments',
  'invoice_cancellations',
] as const;

let superuser: pg.Client;
let app: pg.Pool;
let tenant: TenantFixture;
let other: TenantFixture;
// One POS device in each of the tenant's two outlets, and one in the other tenant.
const device = { a1: randomUUID(), a2: randomUUID(), b1: randomUUID() };

beforeAll(async () => {
  const urls = inject('databaseUrls');
  superuser = new pg.Client({ connectionString: urls.superuser });
  await superuser.connect();
  app = new pg.Pool({ connectionString: urls.app, max: 2 });
  tenant = await createTenant(superuser);
  other = await createTenant(superuser);
  await seedDevice(device.a1, tenant, tenant.outletIds[0], '0A');
  await seedDevice(device.a2, tenant, tenant.outletIds[1], '0B');
  await seedDevice(device.b1, other, other.outletIds[0], '0A');
});

afterAll(async () => {
  await superuser.end();
  await app.end();
});

describe('financial tables', () => {
  it('let app_user insert and read every financial record, never change or remove one', async () => {
    await asTenant(tenant, async (c) => {
      const invoiceId = await insertInvoice(c, tenant.outletIds[0], device.a1, 'AA0A/2627/000001');
      await query(
        c,
        `INSERT INTO invoice_lines (id, tenant_id, outlet_id, invoice_id, line_no, name, hsn_sac,
           unit_price_paise, quantity, tax_rate_bp, discount_paise, taxable_value_paise, cgst_paise, sgst_paise)
         VALUES ($1, $2, $3, $4, 1, 'Masala Chai', '996331', 10000, 1, 500, 0, 10000, 250, 250)`,
        [randomUUID(), tenant.tenantId, tenant.outletIds[0], invoiceId],
      );
      await query(
        c,
        `INSERT INTO invoice_tax_lines (id, tenant_id, outlet_id, invoice_id, tax_rate_bp,
           taxable_value_paise, cgst_paise, sgst_paise)
         VALUES ($1, $2, $3, $4, 500, 10000, 250, 250)`,
        [randomUUID(), tenant.tenantId, tenant.outletIds[0], invoiceId],
      );
      await insertPayment(c, invoiceId, 10500n);
      await insertCancellation(c, invoiceId);

      const refused: string[] = [];
      for (const table of FINANCIAL_TABLES) {
        const { rows } = await c.query<{ count: string }>(`SELECT count(*) FROM ${table}`);
        if (rows[0]?.count !== '1') refused.push(`${table}: read ${String(rows[0]?.count)} rows`);
        const update = await attempt(c, `UPDATE ${table} SET created_at = now()`);
        if (!/permission denied/.test(update)) refused.push(`${table}: update → ${update}`);
        const remove = await attempt(c, `DELETE FROM ${table}`);
        if (!/permission denied/.test(remove)) refused.push(`${table}: delete → ${remove}`);
      }
      expect(refused).toEqual([]);
    });
  });

  it('refuses a second invoice with the same number in one outlet', async () => {
    await asTenant(tenant, async (c) => {
      await insertInvoice(c, tenant.outletIds[0], device.a1, 'AA0A/2627/000002');
      await expect(
        insertInvoice(c, tenant.outletIds[0], device.a1, 'AA0A/2627/000002'),
      ).rejects.toThrow(/invoices_outlet_id_invoice_no_key/);
    });
  });

  it('accepts the same number in another outlet, whose series is its own', async () => {
    await asTenant(tenant, async (c) => {
      await insertInvoice(c, tenant.outletIds[0], device.a1, 'AA0A/2627/000003');
      await expect(
        insertInvoice(c, tenant.outletIds[1], device.a2, 'AA0A/2627/000003'),
      ).resolves.toEqual(expect.any(String));
    });
  });

  it('refuses an invoice number longer than GST allows', async () => {
    await asTenant(tenant, async (c) => {
      await expect(
        insertInvoice(c, tenant.outletIds[0], device.a1, 'AA0A/2627/0000001'),
      ).rejects.toThrow(/invoices_invoice_no_length_check/);
    });
  });

  it("refuses an invoice issued by another outlet's device", async () => {
    await asTenant(tenant, async (c) => {
      await expect(
        insertInvoice(c, tenant.outletIds[0], device.a2, 'AA0B/2627/000001'),
      ).rejects.toThrow(/invoices_device_fk/);
    });
  });
});

describe('invoices_with_status', () => {
  it('derives cancelled from a cancellation record and sums what was paid', async () => {
    await asTenant(tenant, async (c) => {
      const kept = await insertInvoice(c, tenant.outletIds[0], device.a1, 'AA0A/2627/000010');
      const cancelled = await insertInvoice(c, tenant.outletIds[0], device.a1, 'AA0A/2627/000011');
      await insertPayment(c, kept, 5000n);
      await insertPayment(c, kept, 5500n);
      await insertCancellation(c, cancelled);

      const { rows } = await c.query<{
        invoice_no: string;
        status: string;
        cancellation_reason: string | null;
        paid_paise: string;
      }>(
        `SELECT invoice_no, status, cancellation_reason, paid_paise FROM invoices_with_status
          WHERE id = ANY($1) ORDER BY invoice_no`,
        [[kept, cancelled]],
      );
      expect(rows).toEqual([
        {
          invoice_no: 'AA0A/2627/000010',
          status: 'issued',
          cancellation_reason: null,
          paid_paise: '10500',
        },
        {
          invoice_no: 'AA0A/2627/000011',
          status: 'cancelled',
          cancellation_reason: 'Wrong table',
          paid_paise: '0',
        },
      ]);
    });
  });

  it("shows a context only its own tenant's and its own outlets' invoices", async () => {
    // Committed as the superuser, so they exist outside the context that reads.
    const hidden = [
      await seedInvoice(other, other.outletIds[0], device.b1, 'BB0A/2627/000001'),
      await seedInvoice(tenant, tenant.outletIds[1], device.a2, 'AA0B/2627/000020'),
    ];
    await asTenant({ tenantId: tenant.tenantId, outletIds: [tenant.outletIds[0]] }, async (c) => {
      const own = await insertInvoice(c, tenant.outletIds[0], device.a1, 'AA0A/2627/000020');
      const { rows } = await c.query<{ id: string }>(
        'SELECT id FROM invoices_with_status WHERE id = ANY($1)',
        [[own, ...hidden]],
      );
      expect(rows.map((r) => r.id)).toEqual([own]);
    });
  });
});

describe('orders', () => {
  it('keep the name, price and tax rate they were ordered at after the menu item changes or goes', async () => {
    await asTenant(tenant, async (c) => {
      const outletId = tenant.outletIds[0];
      const categoryId = randomUUID();
      const itemId = randomUUID();
      await query(
        c,
        "INSERT INTO menu_categories (id, tenant_id, outlet_id, name) VALUES ($1, $2, $3, 'Chai')",
        [categoryId, tenant.tenantId, outletId],
      );
      await query(
        c,
        `INSERT INTO menu_items (id, tenant_id, outlet_id, category_id, name, food_type, price_paise)
         VALUES ($1, $2, $3, $4, 'Masala Chai', 'veg', 4000)`,
        [itemId, tenant.tenantId, outletId, categoryId],
      );
      const { orderItemId } = await insertOrder(c, outletId, itemId);
      await query(
        c,
        "UPDATE menu_items SET name = 'Kadak Chai', price_paise = 5000, tax_rate_bp = 1800 WHERE id = $1",
        [itemId],
      );
      await query(c, 'DELETE FROM menu_items WHERE id = $1', [itemId]);

      const { rows } = await c.query(
        'SELECT name, unit_price_paise, tax_rate_bp, hsn_sac FROM order_items WHERE id = $1',
        [orderItemId],
      );
      expect(rows).toEqual([
        { name: 'Masala Chai', unit_price_paise: '4000', tax_rate_bp: 500, hsn_sac: '996331' },
      ]);
    });
  });

  it('refuses to delete an item already sent to the kitchen, and to delete an order at all', async () => {
    await asTenant(tenant, async (c) => {
      const outletId = tenant.outletIds[0];
      const { orderId, orderItemId } = await insertOrder(c, outletId, randomUUID());
      const kotId = await insertKot(c, outletId, orderId, device.a1, '2026-10-14', 1);
      await query(
        c,
        `INSERT INTO kot_items (id, tenant_id, outlet_id, kot_id, order_item_id, name, quantity)
         VALUES ($1, $2, $3, $4, $5, 'Masala Chai', 2)`,
        [randomUUID(), tenant.tenantId, outletId, kotId, orderItemId],
      );
      await expect(
        query(c, 'DELETE FROM order_items WHERE id = $1', [orderItemId]),
      ).rejects.toThrow(/kot_items_order_item_fk/);
      await expect(query(c, 'DELETE FROM orders WHERE id = $1', [orderId])).rejects.toThrow(
        /permission denied/,
      );
    });
  });
});

describe('kots', () => {
  it('number from 1 per device per business day, so two tills never clash', async () => {
    await asTenant(tenant, async (c) => {
      const outletId = tenant.outletIds[0];
      const secondTill = randomUUID();
      await seedDevice(secondTill, tenant, outletId, '0C');
      const { orderId } = await insertOrder(c, outletId, randomUUID());
      await insertKot(c, outletId, orderId, device.a1, '2026-10-15', 1);
      await expect(insertKot(c, outletId, orderId, secondTill, '2026-10-15', 1)).resolves.toEqual(
        expect.any(String),
      );
      await expect(insertKot(c, outletId, orderId, device.a1, '2026-10-16', 1)).resolves.toEqual(
        expect.any(String),
      );
      await expect(insertKot(c, outletId, orderId, device.a1, '2026-10-15', 1)).rejects.toThrow(
        /kots_device_business_date_kot_no_key/,
      );
    });
  });

  it('give server-made tickets, which have no device, one series of their own', async () => {
    await asTenant(tenant, async (c) => {
      const outletId = tenant.outletIds[0];
      const { orderId } = await insertOrder(c, outletId, randomUUID());
      await insertKot(c, outletId, orderId, null, '2026-10-17', 1);
      await expect(insertKot(c, outletId, orderId, null, '2026-10-17', 1)).rejects.toThrow(
        /kots_device_business_date_kot_no_key/,
      );
    });
  });
});

describe('sync_ops', () => {
  it('records an op once: a replayed op id or a repeated device sequence is refused, and nothing is changed or removed', async () => {
    await asTenant(tenant, async (c) => {
      const opId = randomUUID();
      await insertSyncOp(c, opId, 1);
      await expect(insertSyncOp(c, opId, 2)).rejects.toThrow(/sync_ops_pkey/);
      await expect(insertSyncOp(c, randomUUID(), 1)).rejects.toThrow(
        /sync_ops_device_id_device_seq_key/,
      );
      await expect(query(c, 'UPDATE sync_ops SET device_seq = 9')).rejects.toThrow(
        /permission denied/,
      );
      await expect(query(c, 'DELETE FROM sync_ops')).rejects.toThrow(/permission denied/);
    });
  });
});

describe('aggregator_orders', () => {
  it('refuses a second order with the same provider order id, so a repeated webhook makes one order', async () => {
    await asTenant(tenant, async (c) => {
      const outletId = tenant.outletIds[0];
      const linkId = randomUUID();
      await query(
        c,
        `INSERT INTO aggregator_links (id, tenant_id, outlet_id, provider, ext_store_id)
         VALUES ($1, $2, $3, 'urbanpiper', $4)`,
        [linkId, tenant.tenantId, outletId, `store-${linkId}`],
      );
      const insert = (): Promise<undefined> =>
        query(
          c,
          `INSERT INTO aggregator_orders (id, tenant_id, outlet_id, link_id, provider, ext_order_id, channel)
           VALUES ($1, $2, $3, $4, 'urbanpiper', $5, 'swiggy')`,
          [randomUUID(), tenant.tenantId, outletId, linkId, `up-${linkId}`],
        );
      await insert();
      await expect(insert()).rejects.toThrow(/aggregator_orders_provider_ext_order_id_key/);
    });
  });
});

// --- helpers, as app_user unless named otherwise -----------------------------

async function seedDevice(
  id: string,
  t: TenantFixture,
  outletId: string,
  code: string,
): Promise<void> {
  await superuser.query(
    "INSERT INTO devices (id, tenant_id, outlet_id, device_code, role, token_hash) VALUES ($1, $2, $3, $4, 'pos', $5)",
    [id, t.tenantId, outletId, code, `hash-${id}`],
  );
}

async function insertInvoice(
  c: pg.PoolClient,
  outletId: string,
  deviceId: string,
  invoiceNo: string,
): Promise<string> {
  const id = randomUUID();
  await query(c, `INSERT INTO invoices (${INVOICE_COLUMNS}) VALUES (${INVOICE_VALUES})`, [
    id,
    tenant.tenantId,
    outletId,
    randomUUID(),
    deviceId,
    invoiceNo,
  ]);
  return id;
}

// A ₹105.00 bill: ₹100.00 taxable at 5%, split into CGST and SGST.
const INVOICE_COLUMNS = `id, tenant_id, outlet_id, order_id, device_id, invoice_no, fy, issued_at,
  business_date, tax_mode, price_mode, place_of_supply, taxable_value_paise, cgst_paise,
  sgst_paise, discount_paise, service_charge_paise, round_off_paise, grand_total_paise`;
const INVOICE_VALUES = `$1, $2, $3, $4, $5, $6, '2627', now(), '2026-10-14', 'regular', 'exclusive',
  '27', 10000, 250, 250, 0, 0, 0, 10500`;

async function seedInvoice(
  t: TenantFixture,
  outletId: string,
  deviceId: string,
  invoiceNo: string,
): Promise<string> {
  const id = randomUUID();
  await superuser.query(`INSERT INTO invoices (${INVOICE_COLUMNS}) VALUES (${INVOICE_VALUES})`, [
    id,
    t.tenantId,
    outletId,
    randomUUID(),
    deviceId,
    invoiceNo,
  ]);
  return id;
}

async function insertPayment(c: pg.PoolClient, invoiceId: string, amount: bigint): Promise<void> {
  await query(
    c,
    `INSERT INTO payments (id, tenant_id, outlet_id, invoice_id, method, amount_paise, received_at)
     SELECT $1, tenant_id, outlet_id, id, 'upi', $3, now() FROM invoices WHERE id = $2`,
    [randomUUID(), invoiceId, amount.toString()],
  );
}

async function insertCancellation(c: pg.PoolClient, invoiceId: string): Promise<void> {
  await query(
    c,
    `INSERT INTO invoice_cancellations (id, tenant_id, outlet_id, invoice_id, reason, cancelled_at)
     SELECT $1, tenant_id, outlet_id, id, 'Wrong table', now() FROM invoices WHERE id = $2`,
    [randomUUID(), invoiceId],
  );
}

async function insertOrder(
  c: pg.PoolClient,
  outletId: string,
  menuItemId: string,
): Promise<{ orderId: string; orderItemId: string }> {
  const orderId = randomUUID();
  const orderItemId = randomUUID();
  await query(
    c,
    `INSERT INTO orders (id, tenant_id, outlet_id, channel, type, status)
     VALUES ($1, $2, $3, 'pos', 'takeaway', 'open')`,
    [orderId, tenant.tenantId, outletId],
  );
  await query(
    c,
    `INSERT INTO order_items (id, tenant_id, outlet_id, order_id, menu_item_id, name, hsn_sac,
       unit_price_paise, quantity, tax_rate_bp)
     VALUES ($1, $2, $3, $4, $5, 'Masala Chai', '996331', 4000, 2, 500)`,
    [orderItemId, tenant.tenantId, outletId, orderId, menuItemId],
  );
  return { orderId, orderItemId };
}

async function insertKot(
  c: pg.PoolClient,
  outletId: string,
  orderId: string,
  deviceId: string | null,
  businessDate: string,
  kotNo: number,
): Promise<string> {
  const id = randomUUID();
  await query(
    c,
    `INSERT INTO kots (id, tenant_id, outlet_id, order_id, device_id, kot_no, business_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, tenant.tenantId, outletId, orderId, deviceId, kotNo, businessDate],
  );
  return id;
}

function insertSyncOp(c: pg.PoolClient, opId: string, deviceSeq: number): Promise<undefined> {
  return query(
    c,
    `INSERT INTO sync_ops (op_id, tenant_id, outlet_id, device_id, device_seq, type, entity_id,
       payload, op_created_at)
     VALUES ($1, $2, $3, $4, $5, 'invoice.create', $6, '{}', now())`,
    [opId, tenant.tenantId, tenant.outletIds[0], device.a1, deviceSeq, randomUUID()],
  );
}

// A transaction as app_user with the tenant context set; always rolled back.
async function asTenant(
  t: { tenantId: string; outletIds: readonly string[] },
  fn: (c: pg.PoolClient) => Promise<void>,
): Promise<void> {
  const c = await app.connect();
  try {
    await c.query('BEGIN');
    await c.query(
      "SELECT set_config('app.tenant_id', $1, true), set_config('app.outlet_ids', $2, true)",
      [t.tenantId, t.outletIds.join(',')],
    );
    await fn(c);
  } finally {
    await c.query('ROLLBACK');
    c.release();
  }
}

// Each statement in its own savepoint, so an expected refusal leaves the
// transaction usable for the next one.
async function query(c: pg.PoolClient, text: string, values: unknown[] = []): Promise<undefined> {
  await c.query('SAVEPOINT stmt');
  try {
    await c.query(text, values);
    await c.query('RELEASE SAVEPOINT stmt');
  } catch (error) {
    await c.query('ROLLBACK TO SAVEPOINT stmt');
    throw error;
  }
  return undefined;
}

// The error message of a statement, or "accepted".
async function attempt(c: pg.PoolClient, text: string): Promise<string> {
  try {
    await query(c, text);
    return 'accepted';
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}
