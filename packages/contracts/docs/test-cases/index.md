# Contracts test cases

What the shared wire shapes promise, stated as Given / When / Then, with the
tests that check them. Cited as `contracts NNNN`. Numbers are stable and never
reused. How to read a case, and what Proposed / Accepted / Superseded and
**GAP** mean: [the platform catalogue](../../../../docs/test-cases/index.md).

These cases hold the schemas themselves. Each side of a wire also asserts the
shared fixture in its own contract tests; those cases live with that side.

Write one with the `test-case` skill.

## Money and ids

- [0001 Money crosses the wire as canonical paise digits and decodes to the exact amount](./0001-money-crosses-the-wire-as-canonical-paise-digits-and-decodes-to-the-exact-amount.md)
- [0002 Every id a client makes is a lowercase UUIDv7 carrying its creation time](./0002-every-id-a-client-makes-is-a-lowercase-uuidv7-carrying-its-creation-time.md)

## Sync, errors and events

- [0003 A sync push is 1 to 200 typed ops with no repeated op or sequence, and nothing unknown is dropped](./0003-a-sync-push-is-1-to-200-typed-ops-with-no-repeated-op-or-sequence-and-nothing-unknown-is-dropped.md)
- [0004 Every API error reads as a code, a message and a request id](./0004-every-api-error-reads-as-a-code-a-message-and-a-request-id.md)
- [0005 A socket event carries ids only, under its literal name](./0005-a-socket-event-carries-ids-only-under-its-literal-name.md)
- [0006 The shared vocabularies are closed lists of literal values](./0006-the-shared-vocabularies-are-closed-lists-of-literal-values.md)
