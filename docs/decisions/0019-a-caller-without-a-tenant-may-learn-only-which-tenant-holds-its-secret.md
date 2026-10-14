---
type: Decision
title: A caller without a tenant may learn only which tenant holds its secret
description: Sign-in, device tokens, refresh tokens and table QR codes are resolved to their tenant before any tenant context exists, through a few fixed database lookups that return only identifiers and need the secret itself, instead of a general cross-tenant read.
tags: [adr, multi-tenancy, security, database, auth]
timestamp: 2026-10-14T00:00:00Z
---

# 19. A caller without a tenant may learn only which tenant holds its secret

Date: 2026-10-14

## Status

Proposed

## Context

[ADR 0005](0005-tenant-isolation-is-enforced-by-the-database.md) makes every
tenant row invisible unless the request has first said which tenant it acts
for, and keeps cross-tenant access to one privileged, audited module.

Four requests cannot say which tenant they act for, because finding that out is
the point of the request:

- an owner signing in with an email or phone and a password (TRD §13);
- a till or kitchen screen presenting its long-lived device token;
- a browser presenting a refresh token;
- a guest opening a table's QR code (Q1), with no login at all.

Under ADR 0005 as written, each of these sees no rows and cannot proceed. The
alternatives:

- **Route them through the privileged module.** That puts every guest scan and
  every sign-in on the path meant for rare, audited support work. The module
  stops being rare, and the audit log fills with noise that hides what it is
  for.
- **Put the tenant in every credential.** A tenant code typed at sign-in, or a
  tenant id inside every token and QR URL. That works for tokens, but owners
  then have to remember a tenant code, and a stale or forged tenant id still
  needs a lookup to reject.
- **Keep a tenant-free directory of logins and tokens.** It duplicates secrets
  into a table that sits outside isolation, and it has to be kept in step with
  the real rows.

## Decision

The database offers a **small, fixed set of lookups** that run before any
tenant context exists. Each one takes what the caller already holds, a login
or a secret (a token's hash, a QR code's token), and returns **only the
identifiers** needed to open that tenant's context: the tenant, and where it
applies the outlet and the row's own id. Nothing else comes back. The
application then reads the full row, password hash included, inside the
tenant context, under the ordinary isolation rules.

The lookups are the only way past isolation that the application role has.
They cannot be widened from the application: their effect depends on running
as the tables' owner, which the application role never is, and the
application role may neither create nor loosen policies.

Adding a lookup means a new decision. It is not a pattern to reuse for reports,
jobs or support.

A login names one user across the whole platform, so an email or phone belongs
to at most one tenant.

## Consequences

Sign-in, device authentication, token refresh and guest QR scans work without
widening the privileged module or adding a directory to keep in sync.

The lookups are a second, narrow gap in isolation beside the privileged module.
ADR 0005 still holds for everything else. A reader who takes "nothing crosses
tenants except the privileged module" literally will be wrong about these
four.

Anyone holding a login (not a password) learns which tenant it belongs to and
the user's id. Nothing a caller is shown depends on that, and sign-in has to
answer the same way for an unknown login as for a wrong password, so that
existence is not leaked to the end user.

One person who runs two separate businesses needs two logins. A chain is one
tenant with many outlets ([ADR 0014](0014-built-for-chains-shipped-for-cafes.md)),
so this binds only someone who owns two unrelated tenants.

The isolation test still covers every tenant table. The lookups have tests of
their own, including one showing that the application cannot switch the lookup
behaviour on for itself.
