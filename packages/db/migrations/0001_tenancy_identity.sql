CREATE TYPE "public"."outlet_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."price_mode" AS ENUM('inclusive', 'exclusive');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trial', 'active', 'overdue', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."tax_mode" AS ENUM('regular', 'composition', 'unregistered');--> statement-breakpoint
CREATE TYPE "public"."device_role" AS ENUM('pos', 'kds');--> statement-breakpoint
CREATE TYPE "public"."outlet_role" AS ENUM('owner', 'manager', 'cashier', 'captain', 'kitchen');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."audit_actor_type" AS ENUM('user', 'device', 'platform_admin', 'system');--> statement-breakpoint
CREATE TABLE "floors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "floors_tenant_id_outlet_id_id_key" UNIQUE("tenant_id","outlet_id","id")
);
--> statement-breakpoint
CREATE TABLE "outlets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"legal_name" text NOT NULL,
	"address_line1" text NOT NULL,
	"address_line2" text,
	"city" text NOT NULL,
	"pincode" char(6) NOT NULL,
	"state_code" char(2) NOT NULL,
	"gstin" char(15),
	"fssai" text,
	"tax_mode" "tax_mode" DEFAULT 'regular' NOT NULL,
	"price_mode" "price_mode" DEFAULT 'exclusive' NOT NULL,
	"invoice_prefix" char(2) NOT NULL,
	"kds_amber_after_minutes" integer DEFAULT 10 NOT NULL,
	"kds_red_after_minutes" integer DEFAULT 20 NOT NULL,
	"auto_accept" boolean DEFAULT false NOT NULL,
	"day_end_cutoff" time DEFAULT '04:00' NOT NULL,
	"status" "outlet_status" DEFAULT 'active' NOT NULL,
	"suspended_at" timestamp with time zone,
	"suspension_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outlets_tenant_id_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "outlets_tenant_id_invoice_prefix_key" UNIQUE("tenant_id","invoice_prefix"),
	CONSTRAINT "outlets_state_code_check" CHECK ("outlets"."state_code" ~ '^[0-9]{2}$'),
	CONSTRAINT "outlets_invoice_prefix_check" CHECK ("outlets"."invoice_prefix" ~ '^[A-Z0-9]{2}$'),
	CONSTRAINT "outlets_kds_thresholds_check" CHECK (0 < "outlets"."kds_amber_after_minutes" AND "outlets"."kds_amber_after_minutes" < "outlets"."kds_red_after_minutes"),
	CONSTRAINT "outlets_suspension_check" CHECK (("outlets"."status" = 'suspended') = ("outlets"."suspended_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"status" "subscription_status" DEFAULT 'trial' NOT NULL,
	"plan" text,
	"current_period_start" date,
	"current_period_end" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_outlet_id_key" UNIQUE("outlet_id")
);
--> statement-breakpoint
CREATE TABLE "tables" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"floor_id" uuid NOT NULL,
	"label" text NOT NULL,
	"seats" integer,
	"qr_token" text NOT NULL,
	"qr_rotated_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tables_qr_token_key" UNIQUE("qr_token"),
	CONSTRAINT "tables_outlet_id_label_key" UNIQUE("outlet_id","label")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"device_code" char(2) NOT NULL,
	"role" "device_role" NOT NULL,
	"name" text,
	"token_hash" text NOT NULL,
	"registered_by_user_id" uuid,
	"last_seen_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	"retired_last_invoice_no" text,
	"replaced_by_device_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_outlet_id_device_code_key" UNIQUE("outlet_id","device_code"),
	CONSTRAINT "devices_token_hash_key" UNIQUE("token_hash"),
	CONSTRAINT "devices_device_code_check" CHECK ("devices"."device_code" ~ '^[0-9A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "platform_admins" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"totp_secret" text,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"replaced_by_id" uuid,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_key" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_outlet_roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"role" "outlet_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_outlet_roles_user_id_outlet_id_role_key" UNIQUE("user_id","outlet_id","role")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"password_hash" text NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_tenant_id_id_key" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"outlet_id" uuid,
	"actor_type" "audit_actor_type" NOT NULL,
	"actor_user_id" uuid,
	"actor_device_id" uuid,
	"actor_platform_admin_id" uuid,
	"impersonated_by" uuid,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "floors" ADD CONSTRAINT "floors_outlet_fk" FOREIGN KEY ("tenant_id","outlet_id") REFERENCES "public"."outlets"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_outlet_fk" FOREIGN KEY ("tenant_id","outlet_id") REFERENCES "public"."outlets"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tables" ADD CONSTRAINT "tables_floor_fk" FOREIGN KEY ("tenant_id","outlet_id","floor_id") REFERENCES "public"."floors"("tenant_id","outlet_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_outlet_fk" FOREIGN KEY ("tenant_id","outlet_id") REFERENCES "public"."outlets"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_registered_by_fk" FOREIGN KEY ("tenant_id","registered_by_user_id") REFERENCES "public"."users"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_fk" FOREIGN KEY ("tenant_id","user_id") REFERENCES "public"."users"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_outlet_roles" ADD CONSTRAINT "user_outlet_roles_user_fk" FOREIGN KEY ("tenant_id","user_id") REFERENCES "public"."users"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_outlet_roles" ADD CONSTRAINT "user_outlet_roles_outlet_fk" FOREIGN KEY ("tenant_id","outlet_id") REFERENCES "public"."outlets"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_key" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "audit_log_tenant_id_created_at_idx" ON "audit_log" USING btree ("tenant_id","created_at");--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Hand-written below this line: isolation, grants and resolvers for the tables
-- above, in the same migration that creates them (TRD §5.2, ADR 0005).
-- ---------------------------------------------------------------------------

-- Tenant-wide: the tenant row itself, its outlets list, its users and their
-- roles (read at login, before the outlets are known), tokens and the audit log.
SELECT app.enable_tenant_rls('tenants', NULL, 'id');--> statement-breakpoint
SELECT app.enable_tenant_rls('outlets');--> statement-breakpoint
SELECT app.enable_tenant_rls('users');--> statement-breakpoint
SELECT app.enable_tenant_rls('user_outlet_roles');--> statement-breakpoint
SELECT app.enable_tenant_rls('refresh_tokens');--> statement-breakpoint
SELECT app.enable_tenant_rls('audit_log');--> statement-breakpoint

-- Outlet-scoped: visible only for an outlet in the context (ADR 0014).
SELECT app.enable_tenant_rls('floors', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('tables', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('subscriptions', 'outlet_id');--> statement-breakpoint
SELECT app.enable_tenant_rls('devices', 'outlet_id');--> statement-breakpoint

-- Super admins belong to no tenant: only platform_admin may see them.
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE platform_admins FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- app_user. Tenants, outlets and subscriptions are created by the platform;
-- devices are retired, never deleted, so a code is never reused (TRD §7);
-- the audit log is append-only.
GRANT SELECT, UPDATE ON tenants, outlets TO app_user;--> statement-breakpoint
GRANT SELECT ON subscriptions TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON floors, tables, user_outlet_roles, refresh_tokens TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON users, devices TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT ON audit_log TO app_user;--> statement-breakpoint

-- platform_admin (BYPASSRLS, the audited cross-tenant module only). Same
-- no-delete rules for devices and the audit log.
GRANT SELECT, INSERT, UPDATE ON tenants, outlets, subscriptions, users, devices, platform_admins TO platform_admin;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON floors, tables, user_outlet_roles, refresh_tokens TO platform_admin;--> statement-breakpoint
GRANT SELECT, INSERT ON audit_log TO platform_admin;--> statement-breakpoint

-- Pre-authentication resolvers (ADR 0019). The caller holds a login or a
-- secret but no tenant yet; each returns only the ids needed to open that
-- tenant's context, where the row itself is then read under RLS.
SELECT app.allow_pre_auth_lookup('users');--> statement-breakpoint
SELECT app.allow_pre_auth_lookup('devices');--> statement-breakpoint
SELECT app.allow_pre_auth_lookup('refresh_tokens');--> statement-breakpoint
SELECT app.allow_pre_auth_lookup('tables');--> statement-breakpoint

CREATE FUNCTION app.resolve_login(p_login text)
  RETURNS TABLE (tenant_id uuid, user_id uuid)
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = pg_catalog, public
  AS $$
  BEGIN
    PERFORM set_config('app.pre_auth_lookup', 'on', true);
    RETURN QUERY SELECT u.tenant_id, u.id FROM public.users u
      WHERE lower(u.email) = lower(p_login) OR u.phone = p_login;
    PERFORM set_config('app.pre_auth_lookup', 'off', true);
  END
  $$;--> statement-breakpoint

CREATE FUNCTION app.resolve_device_token(p_token_hash text)
  RETURNS TABLE (tenant_id uuid, outlet_id uuid, device_id uuid)
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = pg_catalog, public
  AS $$
  BEGIN
    PERFORM set_config('app.pre_auth_lookup', 'on', true);
    RETURN QUERY SELECT d.tenant_id, d.outlet_id, d.id FROM public.devices d
      WHERE d.token_hash = p_token_hash;
    PERFORM set_config('app.pre_auth_lookup', 'off', true);
  END
  $$;--> statement-breakpoint

CREATE FUNCTION app.resolve_refresh_token(p_token_hash text)
  RETURNS TABLE (tenant_id uuid, user_id uuid, refresh_token_id uuid)
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = pg_catalog, public
  AS $$
  BEGIN
    PERFORM set_config('app.pre_auth_lookup', 'on', true);
    RETURN QUERY SELECT r.tenant_id, r.user_id, r.id FROM public.refresh_tokens r
      WHERE r.token_hash = p_token_hash;
    PERFORM set_config('app.pre_auth_lookup', 'off', true);
  END
  $$;--> statement-breakpoint

CREATE FUNCTION app.resolve_qr_token(p_qr_token text)
  RETURNS TABLE (tenant_id uuid, outlet_id uuid, table_id uuid)
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = pg_catalog, public
  AS $$
  BEGIN
    PERFORM set_config('app.pre_auth_lookup', 'on', true);
    RETURN QUERY SELECT t.tenant_id, t.outlet_id, t.id FROM public.tables t
      WHERE t.qr_token = p_qr_token;
    PERFORM set_config('app.pre_auth_lookup', 'off', true);
  END
  $$;--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION app.resolve_login(text), app.resolve_device_token(text), app.resolve_refresh_token(text), app.resolve_qr_token(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.resolve_login(text), app.resolve_device_token(text), app.resolve_refresh_token(text), app.resolve_qr_token(text) TO app_user;
