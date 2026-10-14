-- Tenant isolation helpers (TRD §5.2, ADR 0005). Every later migration that
-- creates a tenant table calls app.enable_tenant_rls on it in the same file.
--
-- Runs as bhojnalya_owner, which owns the database and every table and has
-- neither SUPERUSER nor BYPASSRLS, so FORCE ROW LEVEL SECURITY binds it too.
-- The three roles are created outside migrations (infra/postgres/init), because
-- only a superuser can grant BYPASSRLS to platform_admin.

CREATE SCHEMA app;--> statement-breakpoint
REVOKE ALL ON SCHEMA app FROM PUBLIC;--> statement-breakpoint
GRANT USAGE ON SCHEMA app TO app_user, platform_admin;--> statement-breakpoint

-- The request's tenant, or NULL when none is set: a policy comparing to NULL
-- matches nothing, so a query that forgot its context sees no rows (ADR 0005).
CREATE FUNCTION app.tenant_id() RETURNS uuid
  LANGUAGE sql STABLE PARALLEL SAFE
  AS $$ SELECT nullif(current_setting('app.tenant_id', true), '')::uuid $$;--> statement-breakpoint

-- The outlets the principal may reach, from a comma-separated setting; empty
-- when none is set.
CREATE FUNCTION app.outlet_ids() RETURNS uuid[]
  LANGUAGE sql STABLE PARALLEL SAFE
  AS $$
    SELECT coalesce(
      string_to_array(nullif(current_setting('app.outlet_ids', true), ''), ',')::uuid[],
      '{}'::uuid[]
    )
  $$;--> statement-breakpoint

-- True only inside a pre-authentication resolver (ADR 0019): the resolver runs
-- as the table owner and switches the setting on around its one query. The
-- application role can set the same setting, but it is never the owner, so for
-- it this is always false.
CREATE FUNCTION app.in_pre_auth_lookup() RETURNS boolean
  LANGUAGE sql STABLE PARALLEL SAFE
  AS $$
    SELECT current_user = 'bhojnalya_owner'
       AND coalesce(current_setting('app.pre_auth_lookup', true), '') = 'on'
  $$;--> statement-breakpoint

-- ENABLE + FORCE RLS and the tenant_isolation policy on one table. With
-- outlet_column, also the restrictive outlet_isolation policy, so a row is
-- visible only when both its tenant and its outlet are in the context.
CREATE FUNCTION app.enable_tenant_rls(
  tbl regclass,
  outlet_column name DEFAULT NULL,
  tenant_column name DEFAULT 'tenant_id'
) RETURNS void
  LANGUAGE plpgsql
  AS $$
  BEGIN
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %s USING (%I = app.tenant_id()) WITH CHECK (%I = app.tenant_id())',
      tbl, tenant_column, tenant_column
    );
    IF outlet_column IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY outlet_isolation ON %s AS RESTRICTIVE'
        ' USING (%I = ANY (app.outlet_ids()) OR app.in_pre_auth_lookup())'
        ' WITH CHECK (%I = ANY (app.outlet_ids()))',
        tbl, outlet_column, outlet_column
      );
    END IF;
  END
  $$;--> statement-breakpoint

-- Lets a pre-authentication resolver read one table across tenants (ADR 0019).
CREATE FUNCTION app.allow_pre_auth_lookup(tbl regclass) RETURNS void
  LANGUAGE plpgsql
  AS $$
  BEGIN
    EXECUTE format(
      'CREATE POLICY pre_auth_lookup ON %s FOR SELECT USING (app.in_pre_auth_lookup())',
      tbl
    );
  END
  $$;--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION app.enable_tenant_rls(regclass, name, name) FROM PUBLIC;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION app.allow_pre_auth_lookup(regclass) FROM PUBLIC;
