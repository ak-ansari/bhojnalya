# Database test cases

What the database promises the API: tenant isolation, the identity rules
Postgres enforces, and the narrow lookups that run before sign-in. Stated as
Given / When / Then, with the tests that check it. Cited as `db NNNN`. Numbers
are stable and never reused. How to read a case, and what Proposed / Accepted /
Superseded and **GAP** mean: [the platform catalogue](../../../../docs/test-cases/index.md).

Every test here is an integration test against real Postgres, connected as the
application's own role.

Write one with the `test-case` skill.

## Tenant isolation

- [0001 A request made for one tenant sees and changes none of another tenant's rows](./0001-a-request-made-for-one-tenant-sees-and-changes-none-of-another-tenants-rows.md)
- [0002 A request reaches only the outlets it was given](./0002-a-request-reaches-only-the-outlets-it-was-given.md)
- [0003 A request's tenant lasts for its transaction and no longer](./0003-a-requests-tenant-lasts-for-its-transaction-and-no-longer.md)
- [0004 A login, token or QR code reveals only which tenant holds it](./0004-a-login-token-or-qr-code-reveals-only-which-tenant-holds-it.md)

## Identity

- [0005 A device code is never reused in its outlet](./0005-a-device-code-is-never-reused-in-its-outlet.md)
- [0006 An audit entry, once written, is never changed or removed](./0006-an-audit-entry-once-written-is-never-changed-or-removed.md)
