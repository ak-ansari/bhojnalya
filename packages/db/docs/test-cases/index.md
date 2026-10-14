# Database test cases

What the database promises the API: tenant isolation, the identity, billing,
ordering and sync rules Postgres enforces, and the narrow lookups that run
before sign-in. Stated as
Given / When / Then, with the tests that check it. Cited as `db NNNN`. Numbers
are stable and never reused. How to read a case, and what Proposed / Accepted /
Superseded and **GAP** mean: [the platform catalogue](../../../../docs/test-cases/index.md).

Every test here is an integration test against real Postgres, connected as the
application's own role, except the unit test comparing stored vocabularies
with the contract.

Write one with the `test-case` skill.

## Tenant isolation

- [0001 A request made for one tenant sees and changes none of another tenant's rows](./0001-a-request-made-for-one-tenant-sees-and-changes-none-of-another-tenants-rows.md)
- [0002 A request reaches only the outlets it was given](./0002-a-request-reaches-only-the-outlets-it-was-given.md)
- [0003 A request's tenant lasts for its transaction and no longer](./0003-a-requests-tenant-lasts-for-its-transaction-and-no-longer.md)
- [0004 A login, token or QR code reveals only which tenant holds it](./0004-a-login-token-or-qr-code-reveals-only-which-tenant-holds-it.md)

## Identity

- [0005 A device code is never reused in its outlet](./0005-a-device-code-is-never-reused-in-its-outlet.md)
- [0006 An audit entry, once written, is never changed or removed](./0006-an-audit-entry-once-written-is-never-changed-or-removed.md)

## Billing

- [0007 An issued invoice, and everything recorded against it, is never changed or removed](./0007-an-issued-invoice-and-everything-recorded-against-it-is-never-changed-or-removed.md)
- [0008 An invoice number is stored once per outlet, from that outlet's own device](./0008-an-invoice-number-is-stored-once-per-outlet-from-that-outlets-own-device.md)
- [0009 A cancelled invoice keeps its row and number, and its status is derived](./0009-a-cancelled-invoice-keeps-its-row-and-number-and-its-status-is-derived.md)

## Ordering and kitchen

- [0010 An order keeps what it sold and what reached the kitchen](./0010-an-order-keeps-what-it-sold-and-what-reached-the-kitchen.md)
- [0011 A KOT number is used once per till per business day](./0011-a-kot-number-is-used-once-per-till-per-business-day.md)

## Sync and aggregators

- [0012 A synced op is recorded once and never changed](./0012-a-synced-op-is-recorded-once-and-never-changed.md)
- [0013 An aggregator order is stored once, however often it is delivered](./0013-an-aggregator-order-is-stored-once-however-often-it-is-delivered.md)

## Contracts

- [0014 A stored vocabulary holds exactly the values the contract allows](./0014-a-stored-vocabulary-holds-exactly-the-values-the-contract-allows.md)
