-- Keys the new tables reference: a till's rows point at its device and table
-- within the same tenant and outlet.
ALTER TABLE "tables" ADD CONSTRAINT "tables_tenant_id_outlet_id_id_key" UNIQUE("tenant_id","outlet_id","id");--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_tenant_id_outlet_id_id_key" UNIQUE("tenant_id","outlet_id","id");--> statement-breakpoint
CREATE TYPE "public"."food_type" AS ENUM('veg', 'non_veg', 'egg');--> statement-breakpoint
CREATE TYPE "public"."order_channel" AS ENUM('pos', 'qr', 'swiggy', 'zomato');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'open', 'rejected', 'billed', 'settled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('dine_in', 'takeaway', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."table_session_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."kot_status" AS ENUM('new', 'preparing', 'ready');--> statement-breakpoint
CREATE TYPE "public"."discount_kind" AS ENUM('flat', 'percent');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('issued', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'upi', 'card', 'other');--> statement-breakpoint
CREATE TYPE "public"."aggregator_order_status" AS ENUM('placed', 'accepted', 'rejected', 'food_ready', 'dispatched', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."aggregator_provider" AS ENUM('urbanpiper');--> statement-breakpoint
CREATE TYPE "public"."sync_op_type" AS ENUM('order.upsert', 'kot.create', 'invoice.create', 'payment.create', 'invoice.cancel');--> statement-breakpoint
CREATE TABLE "item_modifier_groups" (
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_modifier_groups_pkey" PRIMARY KEY("item_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_categories_tenant_id_outlet_id_id_key" UNIQUE("tenant_id","outlet_id","id")
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"food_type" "food_type" NOT NULL,
	"price_paise" bigint NOT NULL,
	"tax_rate_bp" integer DEFAULT 500 NOT NULL,
	"hsn_sac" text DEFAULT '996331' NOT NULL,
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"in_stock" boolean DEFAULT true NOT NULL,
	"ext_ref" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_items_tenant_id_outlet_id_id_key" UNIQUE("tenant_id","outlet_id","id"),
	CONSTRAINT "menu_items_price_paise_check" CHECK ("menu_items"."price_paise" >= 0),
	CONSTRAINT "menu_items_tax_rate_bp_check" CHECK ("menu_items"."tax_rate_bp" BETWEEN 0 AND 10000)
);
--> statement-breakpoint
CREATE TABLE "menu_versions" (
	"outlet_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_versions_version_check" CHECK ("menu_versions"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "modifier_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"name" text NOT NULL,
	"min_select" integer DEFAULT 0 NOT NULL,
	"max_select" integer DEFAULT 1 NOT NULL,
	"is_variant" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"ext_ref" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modifier_groups_tenant_id_outlet_id_id_key" UNIQUE("tenant_id","outlet_id","id"),
	CONSTRAINT "modifier_groups_select_range_check" CHECK (0 <= "modifier_groups"."min_select" AND "modifier_groups"."min_select" <= "modifier_groups"."max_select" AND "modifier_groups"."max_select" >= 1),
	CONSTRAINT "modifier_groups_variant_check" CHECK (NOT "modifier_groups"."is_variant" OR ("modifier_groups"."min_select" = 1 AND "modifier_groups"."max_select" = 1))
);
--> statement-breakpoint
CREATE TABLE "modifiers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price_paise" bigint DEFAULT 0 NOT NULL,
	"food_type" "food_type",
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"in_stock" boolean DEFAULT true NOT NULL,
	"ext_ref" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modifiers_price_paise_check" CHECK ("modifiers"."price_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_item_modifiers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"modifier_id" uuid,
	"name" text NOT NULL,
	"price_paise" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_item_modifiers_price_paise_check" CHECK ("order_item_modifiers"."price_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"menu_item_id" uuid,
	"name" text NOT NULL,
	"hsn_sac" text NOT NULL,
	"unit_price_paise" bigint NOT NULL,
	"quantity" integer NOT NULL,
	"tax_rate_bp" integer NOT NULL,
	"note" text,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_tenant_id_outlet_id_id_key" UNIQUE("tenant_id","outlet_id","id"),
	CONSTRAINT "order_items_unit_price_paise_check" CHECK ("order_items"."unit_price_paise" >= 0),
	CONSTRAINT "order_items_quantity_check" CHECK ("order_items"."quantity" >= 1),
	CONSTRAINT "order_items_tax_rate_bp_check" CHECK ("order_items"."tax_rate_bp" BETWEEN 0 AND 10000),
	CONSTRAINT "order_items_void_check" CHECK ("order_items"."voided_at" IS NULL OR "order_items"."void_reason" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"channel" "order_channel" NOT NULL,
	"type" "order_type" NOT NULL,
	"status" "order_status" NOT NULL,
	"table_id" uuid,
	"table_session_id" uuid,
	"device_id" uuid,
	"created_by_user_id" uuid,
	"note" text,
	"reject_reason" text,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_tenant_id_outlet_id_id_key" UNIQUE("tenant_id","outlet_id","id"),
	CONSTRAINT "orders_cancel_reason_check" CHECK ("orders"."status" <> 'cancelled' OR "orders"."cancel_reason" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "table_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"table_id" uuid NOT NULL,
	"status" "table_session_status" DEFAULT 'open' NOT NULL,
	"guest_name" text,
	"guest_phone" text,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "table_sessions_tenant_id_outlet_id_id_key" UNIQUE("tenant_id","outlet_id","id"),
	CONSTRAINT "table_sessions_closed_check" CHECK (("table_sessions"."status" = 'closed') = ("table_sessions"."closed_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "kot_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"kot_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kot_items_quantity_check" CHECK ("kot_items"."quantity" >= 1)
);
--> statement-breakpoint
CREATE TABLE "kots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"device_id" uuid,
	"kot_no" integer NOT NULL,
	"business_date" date NOT NULL,
	"status" "kot_status" DEFAULT 'new' NOT NULL,
	"preparing_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kots_tenant_id_outlet_id_id_key" UNIQUE("tenant_id","outlet_id","id"),
	CONSTRAINT "kots_device_business_date_kot_no_key" UNIQUE NULLS NOT DISTINCT("outlet_id","device_id","business_date","kot_no"),
	CONSTRAINT "kots_kot_no_check" CHECK ("kots"."kot_no" >= 1)
);
--> statement-breakpoint
CREATE TABLE "invoice_cancellations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"cancelled_at" timestamp with time zone NOT NULL,
	"device_id" uuid,
	"cancelled_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_cancellations_invoice_id_key" UNIQUE("invoice_id"),
	CONSTRAINT "invoice_cancellations_reason_check" CHECK (char_length("invoice_cancellations"."reason") > 0)
);
--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"order_item_id" uuid,
	"menu_item_id" uuid,
	"name" text NOT NULL,
	"hsn_sac" text NOT NULL,
	"unit_price_paise" bigint NOT NULL,
	"quantity" integer NOT NULL,
	"tax_rate_bp" integer NOT NULL,
	"modifiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"discount_paise" bigint NOT NULL,
	"taxable_value_paise" bigint NOT NULL,
	"cgst_paise" bigint NOT NULL,
	"sgst_paise" bigint NOT NULL,
	"igst_paise" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_lines_invoice_id_line_no_key" UNIQUE("invoice_id","line_no"),
	CONSTRAINT "invoice_lines_quantity_check" CHECK ("invoice_lines"."quantity" >= 1),
	CONSTRAINT "invoice_lines_tax_rate_bp_check" CHECK ("invoice_lines"."tax_rate_bp" BETWEEN 0 AND 10000),
	CONSTRAINT "invoice_lines_amounts_check" CHECK ("invoice_lines"."unit_price_paise" >= 0 AND "invoice_lines"."discount_paise" >= 0 AND "invoice_lines"."taxable_value_paise" >= 0
        AND "invoice_lines"."cgst_paise" >= 0 AND "invoice_lines"."sgst_paise" >= 0 AND "invoice_lines"."igst_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "invoice_tax_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"tax_rate_bp" integer NOT NULL,
	"taxable_value_paise" bigint NOT NULL,
	"cgst_paise" bigint NOT NULL,
	"sgst_paise" bigint NOT NULL,
	"igst_paise" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_tax_lines_invoice_id_tax_rate_bp_key" UNIQUE("invoice_id","tax_rate_bp"),
	CONSTRAINT "invoice_tax_lines_tax_rate_bp_check" CHECK ("invoice_tax_lines"."tax_rate_bp" BETWEEN 0 AND 10000),
	CONSTRAINT "invoice_tax_lines_amounts_check" CHECK ("invoice_tax_lines"."taxable_value_paise" >= 0 AND "invoice_tax_lines"."cgst_paise" >= 0 AND "invoice_tax_lines"."sgst_paise" >= 0 AND "invoice_tax_lines"."igst_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"invoice_no" text NOT NULL,
	"fy" char(4) NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"business_date" date NOT NULL,
	"tax_mode" "tax_mode" NOT NULL,
	"price_mode" "price_mode" NOT NULL,
	"place_of_supply" char(2) NOT NULL,
	"discount_kind" "discount_kind",
	"discount_rate_bp" integer,
	"service_charge_rate_bp" integer,
	"service_charge_taxed" boolean,
	"taxable_value_paise" bigint NOT NULL,
	"cgst_paise" bigint NOT NULL,
	"sgst_paise" bigint NOT NULL,
	"igst_paise" bigint DEFAULT 0 NOT NULL,
	"discount_paise" bigint NOT NULL,
	"service_charge_paise" bigint NOT NULL,
	"round_off_paise" bigint NOT NULL,
	"grand_total_paise" bigint NOT NULL,
	"needs_review" boolean DEFAULT false NOT NULL,
	"review_details" jsonb,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_outlet_id_invoice_no_key" UNIQUE("outlet_id","invoice_no"),
	CONSTRAINT "invoices_tenant_id_outlet_id_id_key" UNIQUE("tenant_id","outlet_id","id"),
	CONSTRAINT "invoices_invoice_no_length_check" CHECK (char_length("invoices"."invoice_no") <= 16),
	CONSTRAINT "invoices_fy_check" CHECK ("invoices"."fy" ~ '^[0-9]{4}$'),
	CONSTRAINT "invoices_place_of_supply_check" CHECK ("invoices"."place_of_supply" ~ '^[0-9]{2}$'),
	CONSTRAINT "invoices_amounts_check" CHECK ("invoices"."taxable_value_paise" >= 0 AND "invoices"."cgst_paise" >= 0 AND "invoices"."sgst_paise" >= 0
        AND "invoices"."igst_paise" >= 0 AND "invoices"."discount_paise" >= 0 AND "invoices"."service_charge_paise" >= 0
        AND "invoices"."grand_total_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount_paise" bigint NOT NULL,
	"reference" text,
	"received_at" timestamp with time zone NOT NULL,
	"device_id" uuid,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_paise_check" CHECK ("payments"."amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "aggregator_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"link_id" uuid NOT NULL,
	"provider" "aggregator_provider" NOT NULL,
	"event_type" text,
	"ext_order_id" text,
	"headers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"raw_body" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "aggregator_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"provider" "aggregator_provider" NOT NULL,
	"ext_store_id" text NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"store_open" boolean DEFAULT true NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aggregator_links_tenant_id_outlet_id_id_key" UNIQUE("tenant_id","outlet_id","id"),
	CONSTRAINT "aggregator_links_provider_ext_store_id_key" UNIQUE("provider","ext_store_id"),
	CONSTRAINT "aggregator_links_outlet_id_provider_key" UNIQUE("outlet_id","provider")
);
--> statement-breakpoint
CREATE TABLE "aggregator_orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"link_id" uuid NOT NULL,
	"provider" "aggregator_provider" NOT NULL,
	"ext_order_id" text NOT NULL,
	"channel" "order_channel" NOT NULL,
	"order_id" uuid,
	"status" "aggregator_order_status" DEFAULT 'placed' NOT NULL,
	"accept_by" timestamp with time zone,
	"rider" jsonb,
	"rider_eta_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aggregator_orders_provider_ext_order_id_key" UNIQUE("provider","ext_order_id")
);
--> statement-breakpoint
CREATE TABLE "device_invoice_counters" (
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"fy" char(4) NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL,
	"last_invoice_no" text,
	"invoice_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_invoice_counters_pkey" PRIMARY KEY("device_id","fy"),
	CONSTRAINT "device_invoice_counters_fy_check" CHECK ("device_invoice_counters"."fy" ~ '^[0-9]{4}$'),
	CONSTRAINT "device_invoice_counters_count_check" CHECK (0 <= "device_invoice_counters"."invoice_count" AND "device_invoice_counters"."invoice_count" <= "device_invoice_counters"."last_seq" AND "device_invoice_counters"."last_seq" <= 999999)
);
--> statement-breakpoint
CREATE TABLE "sync_ops" (
	"op_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"device_seq" bigint NOT NULL,
	"type" "sync_op_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"op_created_at" timestamp with time zone NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sync_ops_device_id_device_seq_key" UNIQUE("device_id","device_seq"),
	CONSTRAINT "sync_ops_device_seq_check" CHECK ("sync_ops"."device_seq" >= 1)
);
--> statement-breakpoint
CREATE TABLE "daily_sales_rollup" (
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"business_date" date NOT NULL,
	"invoice_count" integer DEFAULT 0 NOT NULL,
	"cancelled_count" integer DEFAULT 0 NOT NULL,
	"needs_review_count" integer DEFAULT 0 NOT NULL,
	"taxable_value_paise" bigint DEFAULT 0 NOT NULL,
	"cgst_paise" bigint DEFAULT 0 NOT NULL,
	"sgst_paise" bigint DEFAULT 0 NOT NULL,
	"igst_paise" bigint DEFAULT 0 NOT NULL,
	"discount_paise" bigint DEFAULT 0 NOT NULL,
	"service_charge_paise" bigint DEFAULT 0 NOT NULL,
	"round_off_paise" bigint DEFAULT 0 NOT NULL,
	"grand_total_paise" bigint DEFAULT 0 NOT NULL,
	"cancelled_total_paise" bigint DEFAULT 0 NOT NULL,
	"breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_sales_rollup_pkey" PRIMARY KEY("outlet_id","business_date")
);
--> statement-breakpoint
ALTER TABLE "item_modifier_groups" ADD CONSTRAINT "item_modifier_groups_item_fk" FOREIGN KEY ("tenant_id","outlet_id","item_id") REFERENCES "public"."menu_items"("tenant_id","outlet_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_modifier_groups" ADD CONSTRAINT "item_modifier_groups_group_fk" FOREIGN KEY ("tenant_id","outlet_id","group_id") REFERENCES "public"."modifier_groups"("tenant_id","outlet_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_outlet_fk" FOREIGN KEY ("tenant_id","outlet_id") REFERENCES "public"."outlets"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_fk" FOREIGN KEY ("tenant_id","outlet_id","category_id") REFERENCES "public"."menu_categories"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_versions" ADD CONSTRAINT "menu_versions_outlet_fk" FOREIGN KEY ("tenant_id","outlet_id") REFERENCES "public"."outlets"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_outlet_fk" FOREIGN KEY ("tenant_id","outlet_id") REFERENCES "public"."outlets"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifiers" ADD CONSTRAINT "modifiers_group_fk" FOREIGN KEY ("tenant_id","outlet_id","group_id") REFERENCES "public"."modifier_groups"("tenant_id","outlet_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_order_item_fk" FOREIGN KEY ("tenant_id","outlet_id","order_item_id") REFERENCES "public"."order_items"("tenant_id","outlet_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_fk" FOREIGN KEY ("tenant_id","outlet_id","order_id") REFERENCES "public"."orders"("tenant_id","outlet_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_outlet_fk" FOREIGN KEY ("tenant_id","outlet_id") REFERENCES "public"."outlets"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_fk" FOREIGN KEY ("tenant_id","outlet_id","table_id") REFERENCES "public"."tables"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_session_fk" FOREIGN KEY ("tenant_id","outlet_id","table_session_id") REFERENCES "public"."table_sessions"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_device_fk" FOREIGN KEY ("tenant_id","outlet_id","device_id") REFERENCES "public"."devices"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_fk" FOREIGN KEY ("tenant_id","created_by_user_id") REFERENCES "public"."users"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_table_fk" FOREIGN KEY ("tenant_id","outlet_id","table_id") REFERENCES "public"."tables"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kot_items" ADD CONSTRAINT "kot_items_kot_fk" FOREIGN KEY ("tenant_id","outlet_id","kot_id") REFERENCES "public"."kots"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kot_items" ADD CONSTRAINT "kot_items_order_item_fk" FOREIGN KEY ("tenant_id","outlet_id","order_item_id") REFERENCES "public"."order_items"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kots" ADD CONSTRAINT "kots_order_fk" FOREIGN KEY ("tenant_id","outlet_id","order_id") REFERENCES "public"."orders"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kots" ADD CONSTRAINT "kots_device_fk" FOREIGN KEY ("tenant_id","outlet_id","device_id") REFERENCES "public"."devices"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_cancellations" ADD CONSTRAINT "invoice_cancellations_invoice_fk" FOREIGN KEY ("tenant_id","outlet_id","invoice_id") REFERENCES "public"."invoices"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_cancellations" ADD CONSTRAINT "invoice_cancellations_device_fk" FOREIGN KEY ("tenant_id","outlet_id","device_id") REFERENCES "public"."devices"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_cancellations" ADD CONSTRAINT "invoice_cancellations_cancelled_by_fk" FOREIGN KEY ("tenant_id","cancelled_by_user_id") REFERENCES "public"."users"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_fk" FOREIGN KEY ("tenant_id","outlet_id","invoice_id") REFERENCES "public"."invoices"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_tax_lines" ADD CONSTRAINT "invoice_tax_lines_invoice_fk" FOREIGN KEY ("tenant_id","outlet_id","invoice_id") REFERENCES "public"."invoices"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_device_fk" FOREIGN KEY ("tenant_id","outlet_id","device_id") REFERENCES "public"."devices"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_fk" FOREIGN KEY ("tenant_id","created_by_user_id") REFERENCES "public"."users"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_fk" FOREIGN KEY ("tenant_id","outlet_id","invoice_id") REFERENCES "public"."invoices"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_device_fk" FOREIGN KEY ("tenant_id","outlet_id","device_id") REFERENCES "public"."devices"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_fk" FOREIGN KEY ("tenant_id","created_by_user_id") REFERENCES "public"."users"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aggregator_events" ADD CONSTRAINT "aggregator_events_link_fk" FOREIGN KEY ("tenant_id","outlet_id","link_id") REFERENCES "public"."aggregator_links"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aggregator_links" ADD CONSTRAINT "aggregator_links_outlet_fk" FOREIGN KEY ("tenant_id","outlet_id") REFERENCES "public"."outlets"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aggregator_orders" ADD CONSTRAINT "aggregator_orders_link_fk" FOREIGN KEY ("tenant_id","outlet_id","link_id") REFERENCES "public"."aggregator_links"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aggregator_orders" ADD CONSTRAINT "aggregator_orders_order_fk" FOREIGN KEY ("tenant_id","outlet_id","order_id") REFERENCES "public"."orders"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_invoice_counters" ADD CONSTRAINT "device_invoice_counters_device_fk" FOREIGN KEY ("tenant_id","outlet_id","device_id") REFERENCES "public"."devices"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_ops" ADD CONSTRAINT "sync_ops_device_fk" FOREIGN KEY ("tenant_id","outlet_id","device_id") REFERENCES "public"."devices"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_sales_rollup" ADD CONSTRAINT "daily_sales_rollup_outlet_fk" FOREIGN KEY ("tenant_id","outlet_id") REFERENCES "public"."outlets"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_item_modifiers_order_item_id_idx" ON "order_item_modifiers" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_outlet_id_status_idx" ON "orders" USING btree ("outlet_id","status");--> statement-breakpoint
CREATE INDEX "orders_outlet_id_updated_at_idx" ON "orders" USING btree ("outlet_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "table_sessions_one_open_per_table_key" ON "table_sessions" USING btree ("table_id") WHERE "table_sessions"."status" = 'open';--> statement-breakpoint
CREATE INDEX "kot_items_kot_id_idx" ON "kot_items" USING btree ("kot_id");--> statement-breakpoint
CREATE INDEX "kots_outlet_id_status_idx" ON "kots" USING btree ("outlet_id","status");--> statement-breakpoint
CREATE INDEX "invoices_outlet_id_business_date_idx" ON "invoices" USING btree ("outlet_id","business_date");--> statement-breakpoint
CREATE INDEX "invoices_outlet_id_needs_review_idx" ON "invoices" USING btree ("outlet_id") WHERE "invoices"."needs_review";--> statement-breakpoint
CREATE INDEX "payments_invoice_id_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "aggregator_events_unprocessed_idx" ON "aggregator_events" USING btree ("received_at") WHERE "aggregator_events"."processed_at" IS NULL;--> statement-breakpoint

-- Every table below is outlet-scoped (ADR 0014): visible only for a tenant
-- and an outlet in the context.
SELECT app.enable_tenant_rls('menu_categories', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('menu_items', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('modifier_groups', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('modifiers', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('item_modifier_groups', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('menu_versions', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('table_sessions', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('orders', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('order_items', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('order_item_modifiers', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('kots', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('kot_items', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('invoices', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('invoice_lines', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('invoice_tax_lines', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('payments', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('invoice_cancellations', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('aggregator_links', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('aggregator_orders', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('aggregator_events', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('sync_ops', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('device_invoice_counters', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('daily_sales_rollup', 'outlet_id');--> statement-breakpoint

-- An invoice's status is derived, never stored (ADR 0008). security_invoker
-- makes the view read its tables as the caller, under the caller's RLS context
-- and grants, not as the view's owner.
CREATE VIEW invoices_with_status WITH (security_invoker = true) AS
  SELECT i.id, i.tenant_id, i.outlet_id, i.order_id, i.device_id, i.invoice_no, i.fy,
         i.issued_at, i.business_date, i.grand_total_paise, i.needs_review,
         (CASE WHEN c.id IS NULL THEN 'issued' ELSE 'cancelled' END)::invoice_status AS status,
         c.cancelled_at,
         c.reason AS cancellation_reason,
         coalesce((SELECT sum(p.amount_paise) FROM payments p WHERE p.invoice_id = i.id), 0)::bigint AS paid_paise
    FROM invoices i
    LEFT JOIN invoice_cancellations c ON c.invoice_id = i.id;--> statement-breakpoint

-- app_user. Financial records are insert and select only (ADR 0008), and so
-- is the log of applied sync ops. Orders and KOTs are never deleted: a void
-- has a reason. An order item not yet sent to the kitchen may be removed.
GRANT SELECT, INSERT, UPDATE, DELETE ON menu_categories, menu_items, modifier_groups, modifiers, item_modifier_groups TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON menu_versions TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON table_sessions, orders, kots TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON order_items, order_item_modifiers TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT ON kot_items TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT ON invoices, invoice_lines, invoice_tax_lines, payments, invoice_cancellations TO app_user;--> statement-breakpoint
GRANT SELECT ON invoices_with_status TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON aggregator_links, aggregator_orders, aggregator_events TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT ON sync_ops TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON device_invoice_counters TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON daily_sales_rollup TO app_user;--> statement-breakpoint

-- platform_admin (BYPASSRLS, the audited cross-tenant module only): read-only
-- for support until a ticket needs more.
GRANT SELECT ON menu_categories, menu_items, modifier_groups, modifiers, item_modifier_groups, menu_versions, table_sessions, orders, order_items, order_item_modifiers, kots, kot_items, invoices, invoice_lines, invoice_tax_lines, payments, invoice_cancellations, invoices_with_status, aggregator_links, aggregator_orders, aggregator_events, sync_ops, device_invoice_counters, daily_sales_rollup TO platform_admin;--> statement-breakpoint

-- Pre-authentication resolver for aggregator webhooks (ADR 0021): the webhook
-- names the provider's store and nothing else; this returns only the ids
-- needed to open that outlet's context, where the link is then read under RLS.
SELECT app.allow_pre_auth_lookup('aggregator_links');--> statement-breakpoint

CREATE FUNCTION app.resolve_aggregator_store(p_provider text, p_ext_store_id text)
  RETURNS TABLE (tenant_id uuid, outlet_id uuid, link_id uuid)
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = pg_catalog, public
  AS $$
  BEGIN
    PERFORM set_config('app.pre_auth_lookup', 'on', true);
    RETURN QUERY SELECT l.tenant_id, l.outlet_id, l.id FROM public.aggregator_links l
      WHERE l.provider::text = p_provider AND l.ext_store_id = p_ext_store_id;
    PERFORM set_config('app.pre_auth_lookup', 'off', true);
  END
  $$;--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION app.resolve_aggregator_store(text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.resolve_aggregator_store(text, text) TO app_user;
