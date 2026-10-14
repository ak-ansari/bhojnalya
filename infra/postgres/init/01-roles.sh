#!/bin/sh
# Creates the database and the three roles every other piece relies on
# (TRD §5.2, ADR 0005). Runs once, as the bootstrap superuser, the first time
# the container starts on an empty volume. Role names are a contract with
# packages/db's migrations: change them in both places or neither.
#
#   bhojnalya_owner  LOGIN, owns the database and every table; runs migrations.
#                    Not a superuser and no BYPASSRLS, so FORCE RLS binds it.
#   app_user         LOGIN, what the API connects as. No BYPASSRLS, owns
#                    nothing; table grants come from the migrations.
#   platform_admin   LOGIN + BYPASSRLS, for the audited cross-tenant module
#                    only. Created here because only a superuser can grant
#                    BYPASSRLS; its table grants come from the migrations.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  -v db_name="$DB_NAME" \
  -v owner_pw="$DB_OWNER_PASSWORD" \
  -v app_pw="$APP_USER_PASSWORD" \
  -v admin_pw="$PLATFORM_ADMIN_PASSWORD" <<'SQL'
CREATE ROLE bhojnalya_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD :'owner_pw';
CREATE ROLE app_user        LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD :'app_pw';
CREATE ROLE platform_admin  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS   PASSWORD :'admin_pw';

CREATE DATABASE :"db_name" OWNER bhojnalya_owner ENCODING 'UTF8' TEMPLATE template0;
REVOKE ALL ON DATABASE :"db_name" FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE :"db_name" TO app_user, platform_admin;
SQL

# In PG 15+ `public` belongs to the database owner and PUBLIC cannot create in
# it, so bhojnalya_owner alone can create objects there.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$DB_NAME" <<'SQL'
GRANT USAGE ON SCHEMA public TO app_user, platform_admin;
SQL
