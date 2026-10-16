# 31 Auth hardening (QA round 3)

Status: ready-for-agent
Type: bug
Blocked by: none
Workspaces: apps/api (auth, devices, config), packages/db (resolve_login and users only), infra/.env.example

QA round 3 attack pass on ticket 13, development @ 30015c4. Probes: `/private/tmp/claude-501/-Users-akansari-projects-bhojnalya/947da6ab-097f-41ff-891f-25d045e1c00f/scratchpad/auth13/qa13.int.test.ts` (cases Q1–Q12; copy into `apps/api/src/modules/auth/http/` and run with `vitest.int.config.ts`). Each fix starts with a red test.

**HIGH**
1. **Login lookup can match two users** (`0001_tenancy_identity.sql` `app.resolve_login`: `lower(email)=lower(p) OR phone=p`, no ORDER BY; `pre-auth.ts` takes `rows[0]`). A tenant-B user sets `phone` = the victim's email → two rows → the victim's email + the attacker's password signs in as the attacker; the victim's own login may 401; `confirmPasswordReset` can land on the wrong user. Fix: look up by email, or by phone only when the input matches the phone format; `CHECK (phone ~ '^[6-9][0-9]{9}$')` (normalise on write); more than one row → treat as no match. New migration, and an ADR 0019 amendment only if the lookup's contract changes.

**MEDIUM**
2. **Reset-code guess limit is per code**, and anyone can mint a new code: 20 × (request + 5 wrong) = 100 guesses, the real code still works. Add a per-user cap across codes (e.g. ≤ 5 codes and ≤ 10 wrong guesses per hour, then lock reset for the hour). Requesting a code must not cancel the owner's open code more than the cap allows.
3. **Reset leaks account existence by timing**: confirm hashes the new password before checking the code, only for known emails (50 ms vs 7 ms); request returns early for unknown (14 vs 4.8 ms). Breaks case `api 0011`. Check the code first, hash only on a match, and do equal work on the unknown path.
4. **Argon2 under a DB transaction**: login holds a pooled transaction (pool 10) while Argon2 runs; 60 parallel wrong logins push an unrelated request from 23 ms to 812 ms. Run verify/hash outside the transaction, and add rate limiting on `/auth/*` (`@nestjs/throttler`, in-memory per TRD §4.1: per IP and per login).

**LOW-MEDIUM**
5. **Reset doesn't end live access tokens**: a pre-reset token still works for 15 min, and can mint a device token. Add `users.password_changed_at` and reject tokens with `iat` before it (checked where status is checked).
6. A disabled user can complete a reset: confirm must check `status`.
7. `POST /devices` with an id taken in another tenant returns 409 with `details.deviceId`: a cross-tenant existence oracle. Answer the same as any other failed insert, without echoing the id.

**Config and design (do these, record any choice in ADR 0029)**
8. Reject an `AUTH_TOKEN_SECRET` containing `change-me` (and in production, require one); use a separate `RESET_CODE_KEY` (or derive with HKDF) instead of reusing the JWT secret. Update `infra/.env.example` with a placeholder that the API refuses to start with.
9. **Device role in the principal**: `@DeviceOnly('pos')` must be able to tell POS from KDS. Ticket 17's sync push will require POS.
10. **Deny by default**: a route with neither `@RequirePermission` nor `@DeviceOnly` nor `@Public` must fail at startup (or 403), never accept any principal.
11. **Absolute session lifetime**: cap a refresh family at 30 days from sign-in, whatever the sliding window does.
12. **Two tabs refreshing at once sign both out** (ADR 0027 family revoke): allow the just-rotated token to be reused within a short grace (e.g. 10 s) returning the same new pair, or document that clients must single-flight refresh. Pick one in ADR 0029.

Not here: CORS and cookie domain (needs the user's domain decision), revoked devices syncing pending invoices (ticket 17).
