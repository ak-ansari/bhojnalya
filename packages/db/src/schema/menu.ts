// Menu tables, one menu per outlet (TRD §5.3, ADR 0014). A variant is a
// modifier group with min = max = 1 and is_variant. Orders, KOTs and invoices
// snapshot what they sold, so nothing financial joins back to these rows.
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  foreignKey,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { createdAt, outlets, updatedAt } from './tenancy.js';

// The FSSAI veg / non-veg / egg marker printed beside an item.
export const foodType = pgEnum('food_type', ['veg', 'non_veg', 'egg']);

// SAC 996331: restaurant service, the default for every item (TRD §6.1 rule 9).
export const DEFAULT_HSN_SAC = '996331';
// 5% GST, in basis points like the contracts' taxRateBp.
export const DEFAULT_TAX_RATE_BP = 500;

export const menuCategories = pgTable(
  'menu_categories',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('menu_categories_tenant_id_outlet_id_id_key').on(t.tenantId, t.outletId, t.id),
    foreignKey({
      name: 'menu_categories_outlet_fk',
      columns: [t.tenantId, t.outletId],
      foreignColumns: [outlets.tenantId, outlets.id],
    }),
  ],
);

export const menuItems = pgTable(
  'menu_items',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    categoryId: uuid('category_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    foodType: foodType('food_type').notNull(),
    pricePaise: bigint('price_paise', { mode: 'bigint' }).notNull(),
    taxRateBp: integer('tax_rate_bp').notNull().default(DEFAULT_TAX_RATE_BP),
    hsnSac: text('hsn_sac').notNull().default(DEFAULT_HSN_SAC),
    imageUrl: text('image_url'),
    sortOrder: integer('sort_order').notNull().default(0),
    // Hidden from every menu when false; in_stock only greys it out (PRD M3).
    isActive: boolean('is_active').notNull().default(true),
    inStock: boolean('in_stock').notNull().default(true),
    // The item's id at each aggregator, keyed by provider (TRD §11.3).
    extRef: jsonb('ext_ref').notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('menu_items_tenant_id_outlet_id_id_key').on(t.tenantId, t.outletId, t.id),
    check('menu_items_price_paise_check', sql`${t.pricePaise} >= 0`),
    check('menu_items_tax_rate_bp_check', sql`${t.taxRateBp} BETWEEN 0 AND 10000`),
    foreignKey({
      name: 'menu_items_category_fk',
      columns: [t.tenantId, t.outletId, t.categoryId],
      foreignColumns: [menuCategories.tenantId, menuCategories.outletId, menuCategories.id],
    }),
  ],
);

export const modifierGroups = pgTable(
  'modifier_groups',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    name: text('name').notNull(),
    minSelect: integer('min_select').notNull().default(0),
    maxSelect: integer('max_select').notNull().default(1),
    isVariant: boolean('is_variant').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    extRef: jsonb('ext_ref').notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('modifier_groups_tenant_id_outlet_id_id_key').on(t.tenantId, t.outletId, t.id),
    check(
      'modifier_groups_select_range_check',
      sql`0 <= ${t.minSelect} AND ${t.minSelect} <= ${t.maxSelect} AND ${t.maxSelect} >= 1`,
    ),
    // A variant (size, portion) is exactly one choice (TRD §5.3).
    check(
      'modifier_groups_variant_check',
      sql`NOT ${t.isVariant} OR (${t.minSelect} = 1 AND ${t.maxSelect} = 1)`,
    ),
    foreignKey({
      name: 'modifier_groups_outlet_fk',
      columns: [t.tenantId, t.outletId],
      foreignColumns: [outlets.tenantId, outlets.id],
    }),
  ],
);

export const modifiers = pgTable(
  'modifiers',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    groupId: uuid('group_id').notNull(),
    name: text('name').notNull(),
    pricePaise: bigint('price_paise', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    foodType: foodType('food_type'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    inStock: boolean('in_stock').notNull().default(true),
    extRef: jsonb('ext_ref').notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('modifiers_price_paise_check', sql`${t.pricePaise} >= 0`),
    foreignKey({
      name: 'modifiers_group_fk',
      columns: [t.tenantId, t.outletId, t.groupId],
      foreignColumns: [modifierGroups.tenantId, modifierGroups.outletId, modifierGroups.id],
    }).onDelete('cascade'),
  ],
);

export const itemModifierGroups = pgTable(
  'item_modifier_groups',
  {
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    itemId: uuid('item_id').notNull(),
    groupId: uuid('group_id').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: 'item_modifier_groups_pkey', columns: [t.itemId, t.groupId] }),
    foreignKey({
      name: 'item_modifier_groups_item_fk',
      columns: [t.tenantId, t.outletId, t.itemId],
      foreignColumns: [menuItems.tenantId, menuItems.outletId, menuItems.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'item_modifier_groups_group_fk',
      columns: [t.tenantId, t.outletId, t.groupId],
      foreignColumns: [modifierGroups.tenantId, modifierGroups.outletId, modifierGroups.id],
    }).onDelete('cascade'),
  ],
);

// The outlet's current menu version, bumped on every menu or stock change; it
// keys the cached guest menu JSON (TRD §10).
export const menuVersions = pgTable(
  'menu_versions',
  {
    outletId: uuid('outlet_id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    version: bigint('version', { mode: 'bigint' })
      .notNull()
      .default(sql`1`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('menu_versions_version_check', sql`${t.version} >= 1`),
    foreignKey({
      name: 'menu_versions_outlet_fk',
      columns: [t.tenantId, t.outletId],
      foreignColumns: [outlets.tenantId, outlets.id],
    }),
  ],
);
