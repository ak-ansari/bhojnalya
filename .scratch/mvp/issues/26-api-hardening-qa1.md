# 26 API hardening from QA round 1

Status: ready-for-agent
Type: bug
Blocked by: 13
Workspaces: apps/api, packages/contracts (error codes only)

QA round 1 on development @ cdcf87a. Probes: `/private/tmp/claude-501/-Users-akansari-projects-bhojnalya/947da6ab-097f-41ff-891f-25d045e1c00f/scratchpad/`. Each fix starts with a red test.

1. **Suspension bypass** (`suspended-outlet.interceptor.ts:31-37`): (a) a principal with no `outletId` skips the check, so a floor POSTed into suspended A2 gets 201; (b) only `principal.outletId` is checked, not the outlet written, so acting as A1 and writing into A2 gets 201. Expected: every mutation checks the outlet it writes to (route param/body), and an owner-level principal is checked too. ADR 0015 exceptions (`@AllowWhenSuspended`) still work.
2. **requestId lost on parser errors.** Invalid JSON (400) or a body >200 KB (413) returns `requestId:"unknown"` and no `X-Request-Id`, even when the client sent one; the message is raw parser text. Cause: body-parser runs before pino-http (`logging.ts:26`), and `error-envelope.filter.ts:52-54` passes the message through. Expected: requestId assigned first; client-safe messages; 413 → its own code.
3. **Idempotency hash depends on key order** (`idempotency.interceptor.ts:71-73`): same key with `{"id":X,"name":"X"}` then `{"name":"X","id":X}` → 201 then 409. Hash a canonical form.
4. **Idempotency key scoped to tenant only**: device 2 in A2 sending A1's key + body gets `201 Idempotent-Replayed` with A1's body (which RLS would hide) and nothing is created. Scope keys to (tenant, principal/device, route).
5. **Replay ignores stored status** (line 62): a stored 200 replays as 201. Store and replay the status.
6. **Upstream status leaks** (`error-envelope.filter.ts:57` `clientStatusOf`): any thrown object with a 4xx `.status` becomes the API's status, e.g. an upstream 401 → `UNAUTHENTICATED` (a till could sign out). 413/429 map to `VALIDATION_FAILED`. Only map HttpExceptions; add codes `PAYLOAD_TOO_LARGE`, `RATE_LIMITED`, `IDEMPOTENCY_KEY_REUSED`, `SERVICE_UNAVAILABLE` to contracts.
7. Drop `X-Powered-By`.
8. Idempotency-Key is optional on mutations (QA question). Make it **required** on routes marked for POS/QR clients (a decorator), per CLAUDE.md invariant 8; leave owner-portal routes optional.
