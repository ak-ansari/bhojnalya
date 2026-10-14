# Architecture decisions

Numbered ADRs in Michael Nygard's format. Numbers are stable and never reused.
A decision that no longer holds is superseded by a new record, not edited.
There is one number space for the whole platform, including decisions that
concern a single app or package. Style guide: [ADR style](../conventions/adr-style.md).

- [0001 Record architecture decisions](./0001-record-architecture-decisions.md) - why ADRs, where they live, and how they relate to the PRD and TRD
- [0002 One language runs on the till and the server](./0002-one-language-runs-on-the-till-and-the-server.md) - the bill printed offline and the bill the server recomputes come from the same code
- [0003 Money is integer paise](./0003-money-is-integer-paise.md) - no floats anywhere; half-up rounding at named points, the CGST/SGST split, largest-remainder discounts and round-off as its own line
- [0004 The billing engine is pure, and the server re-runs it](./0004-the-billing-engine-is-pure-and-the-server-re-runs-it.md) - a deterministic calculation with no I/O; a mismatch is stored as issued and flagged for review, never dropped
- [0005 Tenant isolation is enforced by the database](./0005-tenant-isolation-is-enforced-by-the-database.md) - row-level security the application cannot bypass, a per-table cross-tenant test, and one audited privileged path
- [0006 The till is local-first; the kitchen and guests are online](./0006-the-till-is-local-first-the-kitchen-and-guests-are-online.md) - device first, then an idempotent ordered outbox; sign-out blocked while it holds anything; the kitchen and guest menu pause offline
- [0007 An invoice number comes from a device series](./0007-an-invoice-number-comes-from-a-device-series.md) - one code path online and offline, allocated with the invoice, financial year in IST, codes never reused, a backwards clock blocks billing
- [0008 Financial records are append-only](./0008-financial-records-are-append-only.md) - no update or delete on invoices and payments; cancellation is a new record; documents snapshot what they sold
- [0009 Ids are made by the client](./0009-ids-are-made-by-the-client.md) - time-ordered unique ids created on the device, and an idempotency key on every mutating request
- [0010 A socket event is a notification, not data](./0010-a-socket-event-is-a-notification-not-data.md) - clients refetch on an event and on every reconnect, so a missed event never leaves a stale screen
- [0011 One process and one database until a scale trigger](./0011-one-process-and-one-database-until-a-scale-trigger.md) - API, sockets and jobs in one process on one in-country server; each new piece of infrastructure waits for a named trigger
- [0012 Aggregators sit behind an adapter](./0012-aggregators-sit-behind-an-adapter.md) - one provider-neutral interface; webhooks verified, stored raw and acknowledged at once; all work as retried jobs; switchable per outlet
- [0013 The till and the kitchen are one app; the guest menu is another](./0013-the-till-and-the-kitchen-are-one-app-the-guest-menu-is-another.md) - shared-device screens share an app; the QR menu is separate and stays under 120 KB of gzipped script
- [0014 Built for chains, shipped for cafés](./0014-built-for-chains-shipped-for-cafes.md) - the full tenant → outlet → floor → table hierarchy and later-phase hooks exist now; the screens show one outlet and none of the later features
