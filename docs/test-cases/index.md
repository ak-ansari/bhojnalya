# Test cases

What Bhojnalya promises, stated as Given / When / Then, with the tests that
check it — or **GAP** where nothing does yet. This catalogue holds the
**contracts no single workspace owns** (the sync protocol, socket events, the
invoice the server re-validates, the middleware webhooks). Each workspace keeps
its own catalogue beside its code:

| Catalogue | Holds | Cited as |
| :--- | :--- | :--- |
| `docs/test-cases/` | cross-workspace contracts | `contract 0001` |
| `packages/billing/docs/test-cases/` | the billing and GST engine | `billing 0001` |
| `packages/contracts/docs/test-cases/` | the shared wire schemas | `contracts 0001` |
| `packages/db/docs/test-cases/` | the schema, RLS and grants | `db 0001` |
| `apps/api/docs/test-cases/` | the API, RLS, sync, jobs, webhooks | `api 0001` |
| `apps/app/docs/test-cases/` | the POS and KDS | `app 0001` |
| `apps/menu/docs/test-cases/` | the QR guest menu | `menu 0001` |
| `apps/admin/docs/test-cases/` | owner portal and super admin | `admin 0001` |

A workspace's catalogue is created with its first case. Each has its own
number space; numbers are stable and never reused.

**There are no cases yet.** The repository is pre-code, and a case states what
the code does *today*, never an intention
([documentation layers](../conventions/documentation-layers.md)). The
intentions live in the [user stories](../requirements/user-stories.md).

## Status

A case is **Proposed** while its expectations are being argued, **Accepted**
once they are the agreed definition of correct, and **Superseded** when a
behaviour change makes a later case replace it. A superseded case is kept, not
deleted.

**GAP** marks missing test coverage, not a case that is any less accepted. How
a case earns its level is [a convention](../conventions/testing-levels.md).

## How to read a case

**Given / When / Then** state the promise in the user's and the product's own
terms. They name no port, no command and no component, so they stay true when
the implementation moves.

**Procedure** is the concrete counterpart: how to set the case up, run it and
verify it by hand. It goes stale when the environment changes, which is why it
is kept separate from the promise.

**Coverage** names the automated tests as `describe › it (level)` and gives
the command that runs them.

Write one with the `test-case` skill.
