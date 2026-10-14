---
type: Decision
title: One process and one database until a scale trigger
description: The API, the real-time sockets and the background jobs run in one process against one relational database on one in-country server, and each extra piece of infrastructure waits for a named, measurable trigger.
tags: [adr, infrastructure, cost, architecture]
timestamp: 2026-10-14T00:00:00Z
---

# 11. One process and one database until a scale trigger

Date: 2026-10-14

## Status

Accepted

## Context

The product is self-funded. Traffic is expected to be close to zero for the
first three to four months and to reach tens of outlets after that. One or
two developers have about three months to ship. Every extra service (a cache,
a message broker, a separate worker fleet, a managed database) costs money
every month and adds operational work that this team would carry alone.

The workload is small and mostly regional: bills, kitchen tickets and menu
reads for cafés in India. The till does not depend on the server to keep
selling ([ADR 0006](0006-the-till-is-local-first-the-kitchen-and-guests-are-online.md)),
so a server outage costs sync delay, not lost sales. That makes a single
server acceptable against the 99.5% availability target (N7).

Each part that usually justifies more infrastructure has an in-process or
in-database equivalent at this scale. Real-time sockets fit in the API process
while there is only one instance. A job queue fits inside the relational
database. Rate limiting fits in memory.

## Decision

The API, the real-time socket server and the background job workers run in
**one process**. They use **one relational database**, which also holds the
job queue. Everything runs on **one server in India**. Static front ends,
images, exports and backups go on free-tier edge hosting and object storage.

Nothing is added to this shape until a **named trigger** is met:

| Trigger | Step |
| --- | --- |
| Sustained high CPU, or roughly 150 outlets | A larger server |
| Revenue covers it, or high availability is needed | A managed database, and the same image on a managed container service |
| More than one API instance | A shared store for socket rooms and rate limits; the job queue stays in the database |
| Reports slow down transactional work | A read replica for reports |

Configuration comes only from the environment, so each step is a deployment
change, not a code change.

## Consequences

Running costs stay at roughly a thousand rupees a month, and there is one
thing to deploy, monitor and restore.

The single server is a single point of failure for everything except billing
at the counter. Backups with point-in-time recovery off the server, and a
restore drill that is actually run, are what make this acceptable. A backup
that has never been restored does not count.

Jobs and requests share CPU and connections. A heavy export or rollup can
slow live traffic, so jobs must be kept small and scheduled with that in mind.

Real-time rooms and rate limits that live in memory are lost on restart.
That is acceptable because socket events carry no state
([ADR 0010](0010-a-socket-event-is-a-notification-not-data.md)) and rate
limits only need to be roughly right.

A proposal to add infrastructure has to cite a trigger from this table, or
supersede this ADR. That rules out "we will need it eventually" as a reason.
