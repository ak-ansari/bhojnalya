---
type: Decision
title: Money crosses the wire as a string of digits
description: Every amount in a JSON document is the paise written as a canonical string of decimal digits, never a JSON number and never rupees, decoded into the exact integer at the boundary by one shared definition.
tags: [adr, money, contracts, sync]
timestamp: 2026-10-14T00:00:00Z
---

# 18. Money crosses the wire as a string of digits

Date: 2026-10-14

## Status

Proposed

## Context

Money is a whole number of paise held in a wide integer type
([ADR 0003](./0003-money-is-integer-paise.md)). That type has no JSON
spelling. Amounts still cross JSON at every seam: an invoice in a sync batch
(N2), an API reply the owner portal reads, a socket notification, a stored raw
payload, and the shared fixtures both sides of a contract test assert. ADR 0003
warns that some formats and drivers silently turn large integers into floats
or strings, and that a missed rupee/paise conversion is off by a factor of a
hundred.

The alternatives:

- **A JSON number of paise.** Its range is not the problem, because a
  double holds every paisa up to about ninety lakh crore rupees. The problem is
  that the browser and the server read a JSON number into a float by default.
  An amount that skipped decoding still behaves like money: it adds,
  compares and prints, so the mistake makes no noise. Some code would hold
  money as a float, which ADR 0003 forbids.
- **Rupees as a decimal string (`"200.00"`).** This invites parsing into a
  float, and it puts the factor-of-a-hundred conversion at every boundary
  instead of only at display.
- **A string of paise digits.** A value that skipped decoding is text, not a
  number. The type system keeps it apart from the integer type, mixing the
  two in arithmetic fails at once, and the integer type itself refuses to be
  written to JSON. Every mistake is loud. The database driver already returns
  the wide integer as a string, so the server's storage edge has the same
  shape.

## Decision

**In every JSON document the platform writes or reads, an amount of money is
the number of paise written as a string of decimal digits.** It is never a
JSON number and never rupees.

The string is **canonical**: an optional leading minus, then digits with no
leading zero. There is no plus sign, decimal point, exponent, whitespace or
negative zero. One amount has exactly one spelling, so two documents carrying
the same money compare equal as documents.

**One shared definition decodes and encodes it.** At the boundary, the wire
string becomes the exact integer and the integer becomes the string. No module
writes its own conversion. A non-canonical string or a JSON number is refused
as invalid input. It is never coerced.

The rule covers money only. Counts, sequence numbers and quantities stay JSON
numbers. Rates are whole basis points, so they are also exact as JSON numbers.

## Consequences

An amount that reaches arithmetic without passing the shared decoder fails at
once instead of computing a slightly wrong bill. The same document can be
compared byte-for-byte by meaning on the till, the server and in fixtures.

Hand-written fixtures, test bodies and any API consumer write `"20000"`,
not `20000` or `200.00`. People reading raw payloads see paise as text. A
reader used to rupees will misread `"20000"` as twenty thousand rupees unless
the field name or the docs say paise.

Strictness has a price. A partner or older client that sends a JSON number has
its request refused, not quietly corrected. For sync this is deliberate: the
operation stays in the device's outbox and is shown to staff, so nothing is
lost (ADR 0006).

Storage inside the browser database is not JSON. There the integer can be kept
as itself, and the rule applies where data is turned into JSON: the outbox
batch, an export, an API call.
