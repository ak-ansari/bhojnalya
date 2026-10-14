CREATE TABLE "idempotency_keys" (
	"tenant_id" uuid NOT NULL,
	"key" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"status_code" integer,
	"response_body" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY("tenant_id","key")
);
--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint

-- Tenant isolation, as on every tenant table (TRD §5.2). Keys are tenant-wide:
-- a retry is the same principal's, whichever outlet it acts for.
SELECT app.enable_tenant_rls('idempotency_keys');--> statement-breakpoint

-- app_user claims a key, records the result and reuses an expired one in place;
-- it never deletes. Expired rows are purged across tenants by platform_admin.
GRANT SELECT, INSERT, UPDATE ON idempotency_keys TO app_user;--> statement-breakpoint
GRANT SELECT, DELETE ON idempotency_keys TO platform_admin;--> statement-breakpoint

-- pg-boss's schema (ADR 0020). The API's migrate step installs pg-boss into it
-- as bhojnalya_owner; the running API only reads and writes jobs as app_user,
-- which keeps owning nothing and never runs DDL.
CREATE SCHEMA pgboss;--> statement-breakpoint
REVOKE ALL ON SCHEMA pgboss FROM PUBLIC;--> statement-breakpoint
GRANT USAGE ON SCHEMA pgboss TO app_user;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE bhojnalya_owner IN SCHEMA pgboss
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE bhojnalya_owner IN SCHEMA pgboss
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;
