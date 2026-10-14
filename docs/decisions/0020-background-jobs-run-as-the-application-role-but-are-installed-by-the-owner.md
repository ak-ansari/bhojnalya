---
type: Decision
title: Background jobs run as the application role but are installed by the owner
description: The job queue lives in its own database schema, which the migration owner creates and installs in the deploy's migrate step; the running API reads and writes jobs as the application role, so it still owns nothing and runs no schema changes.
tags: [adr, platform, database, jobs, security]
timestamp: 2026-10-14T00:00:00Z
---

# 20. Background jobs run as the application role but are installed by the owner

Date: 2026-10-14

## Status

Proposed

## Context

[ADR 0011](0011-one-process-and-one-database-until-a-scale-trigger.md) puts
the job queue inside the database and inside the API's process.
[ADR 0005](0005-tenant-isolation-is-enforced-by-the-database.md) has the API
connect as a role that bypasses no isolation and owns no table, and keeps
schema changes with a separate owner role that runs only at deploy time.

A queue library expects to create and upgrade its own tables when it starts,
and some of its operations change those tables' structure. Whoever does that
must own them. Three roles could:

- **The application role.** Simplest, but then it owns tables and runs schema
  changes at start-up, which ADR 0005 rules out, and the check that it owns
  nothing would have to make an exception.
- **The owner role, from the running API.** Puts the migration credential in
  the long-running process that faces the internet.
- **A fourth, queue-only role.** Clean, but one more credential and one more
  piece of database set-up for a single library.

## Decision

The queue gets its **own schema**, created by a migration. The **owner installs
and upgrades the queue's tables** in the deploy's migrate step, straight after
the SQL migrations, never when the API starts. Tables the owner creates in that
schema are readable and writable by the application role by default.

The **running API uses the queue as the application role**, with installing
and upgrading switched off. It sends, fetches and completes jobs and creates
queues that share the common job table, all of which are plain reads and writes.

## Consequences

The application role still owns nothing and never changes the schema. The
migration credential stays in the one-shot migrate step.

A queue that needs its own table, or an upgrade step the library defers to a
running instance, needs the owner. It has to be declared so the migrate step
can create or finish it. A future ticket that needs one adds it there.

Job rows are not tenant rows: the queue's schema has no row-level isolation.
A job carries ids only, and its handler opens a tenant transaction before it
reads any tenant data, as a request does.

The queue holds its own small connection pool beside the requests' pool, so
the process uses a couple of connections more than the request pool's size.
