CREATE TABLE "password_reset_codes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_codes_failed_attempts_check" CHECK ("password_reset_codes"."failed_attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "password_reset_codes" ADD CONSTRAINT "password_reset_codes_user_fk" FOREIGN KEY ("tenant_id","user_id") REFERENCES "public"."users"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "password_reset_codes_user_id_idx" ON "password_reset_codes" USING btree ("user_id","created_at");--> statement-breakpoint

-- Hand-written below this line. Tenant-wide like users (TRD §5.2): a reset
-- happens before any outlet is chosen.
SELECT app.enable_tenant_rls('password_reset_codes');--> statement-breakpoint

-- app_user issues codes, counts wrong guesses and spends them; it never
-- deletes, so every reset attempt stays on record.
GRANT SELECT, INSERT, UPDATE ON password_reset_codes TO app_user;--> statement-breakpoint
GRANT SELECT ON password_reset_codes TO platform_admin;
