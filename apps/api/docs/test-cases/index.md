# API test cases

What the API promises: every request isolated to its tenant, one error
shape, safe retries, the suspension rule, and the process around them.
Stated as Given / When / Then, with the tests that check it. Cited as
`api NNNN`. Numbers are stable and never reused. How to read a case, and
what Proposed / Accepted / Superseded and **GAP** mean:
[the platform catalogue](../../../../docs/test-cases/index.md).

Integration tests run the real API against real Postgres, connected as the
application's own role.

Write one with the `test-case` skill.

## Tenancy

- [0001 Every signed-in request runs in one transaction for its own tenant and outlets](./0001-every-signed-in-request-runs-in-one-transaction-for-its-own-tenant-and-outlets.md)
- [0004 A suspended outlet's changes are refused, but its reads and record-keeping are not](./0004-a-suspended-outlets-changes-are-refused-but-its-reads-and-record-keeping-are-not.md)

## Sign-in and devices

- [0009 An owner signs in with an email or phone and a password, and a failed sign-in reveals nothing](./0009-an-owner-signs-in-with-an-email-or-phone-and-a-password-and-a-failed-sign-in-reveals-nothing.md)
- [0010 A refresh token works once, and a reused one ends that whole sign-in](./0010-a-refresh-token-works-once-and-a-reused-one-ends-that-whole-sign-in.md)
- [0011 A password is reset only with the latest emailed code, within 10 minutes and 5 guesses](./0011-a-password-is-reset-only-with-the-latest-emailed-code-within-10-minutes-and-5-guesses.md)
- [0012 A registered device gets its outlet's next unused code and a token the server keeps only as a hash](./0012-a-registered-device-gets-its-outlets-next-unused-code-and-a-token-the-server-keeps-only-as-a-hash.md)
- [0013 A revoked or replaced device is refused on its next request, and a replaced one's last invoice number is kept](./0013-a-revoked-or-replaced-device-is-refused-on-its-next-request-and-a-replaced-ones-last-invoice-number-is-kept.md)
- [0014 A signed-in request reaches only the outlets its person holds a role at, for 15 minutes](./0014-a-signed-in-request-reaches-only-the-outlets-its-person-holds-a-role-at-for-15-minutes.md)

## Idempotency

- [0003 A retried change with the same key runs once and gets the first answer for 24 hours](./0003-a-retried-change-with-the-same-key-runs-once-and-gets-the-first-answer-for-24-hours.md)

## Errors and logs

- [0002 Every API error reads as a code, a message and the request id, and never a bug's own message](./0002-every-api-error-reads-as-a-code-a-message-and-the-request-id-and-never-a-bugs-own-message.md)
- [0008 Every request's log line names its request, tenant, outlet and device](./0008-every-requests-log-line-names-its-request-tenant-outlet-and-device.md)

## Operations

- [0005 The API reports itself healthy only while its database answers](./0005-the-api-reports-itself-healthy-only-while-its-database-answers.md)
- [0006 The job queue runs inside the API as the application role](./0006-the-job-queue-runs-inside-the-api-as-the-application-role.md)
- [0007 The published API document is built from the same schemas that validate each request](./0007-the-published-api-document-is-built-from-the-same-schemas-that-validate-each-request.md)
