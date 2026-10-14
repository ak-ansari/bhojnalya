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

## Idempotency

- [0003 A retried change with the same key runs once and gets the first answer for 24 hours](./0003-a-retried-change-with-the-same-key-runs-once-and-gets-the-first-answer-for-24-hours.md)

## Errors and logs

- [0002 Every API error reads as a code, a message and the request id, and never a bug's own message](./0002-every-api-error-reads-as-a-code-a-message-and-the-request-id-and-never-a-bugs-own-message.md)
- [0008 Every request's log line names its request, tenant, outlet and device](./0008-every-requests-log-line-names-its-request-tenant-outlet-and-device.md)

## Operations

- [0005 The API reports itself healthy only while its database answers](./0005-the-api-reports-itself-healthy-only-while-its-database-answers.md)
- [0006 The job queue runs inside the API as the application role](./0006-the-job-queue-runs-inside-the-api-as-the-application-role.md)
- [0007 The published API document is built from the same schemas that validate each request](./0007-the-published-api-document-is-built-from-the-same-schemas-that-validate-each-request.md)
