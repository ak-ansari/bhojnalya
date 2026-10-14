---
type: Decision
title: Built for chains, shipped for cafés
description: The data model and APIs carry the full tenant, outlet, floor and table hierarchy and the hooks later phases need from day one, while the MVP's screens show one outlet and one floor and build none of those later features.
tags: [adr, multi-tenancy, data-model, scope]
timestamp: 2026-10-14T00:00:00Z
---

# 14. Built for chains, shipped for cafés

Date: 2026-10-14

## Status

Accepted

## Context

The MVP targets single-outlet cafés and small single-floor restaurants. The
roadmap then moves to full-service restaurants, multi-floor venues and
multi-outlet chains (PRD §1.2, §3). N4 asks for the data model to support the
full tenant, outlet, floor and table hierarchy from day one.

If the MVP data model has a café as the top-level thing, with one floor
implied, chains later mean adding a parent to every row, rewriting every query
and isolation policy, and migrating live financial data. That is a rewrite
done under production load.

Building the chain features now (cross-outlet reports, a central menu, staff
roles, inter-state tax) would use up a twelve-week schedule on features the
first customers cannot use. The trade-off is to pay for the *shape* now and the
*features* later.

## Decision

**The schema and APIs carry the whole hierarchy from day one:** tenant →
outlet → floor → table. Every tenant-owned row carries its tenant, and every
outlet-scoped row also carries its outlet. Menus, orders, invoices, reports and
users are always scoped to an outlet, never to the tenant alone. The APIs
accept many outlets and many floors.

**The MVP screens show one outlet and one floor.** Nothing in the UI offers
creating a second.

**Later phases get hooks, not features.** Where a later feature needs a column,
a table or an enum that would otherwise mean migrating financial data, it
exists now and is unused or used trivially. Two examples: a per-outlet role
assignment for each user, which the MVP uses only for the owner, and the
invoice's place of supply, which the MVP always sets to the outlet's own
state. The features themselves are not built until their phase.

## Consequences

Going multi-outlet or multi-floor becomes a feature release: new screens over
data that is already correctly scoped. Isolation policies
([ADR 0005](0005-tenant-isolation-is-enforced-by-the-database.md)) and the
invoice series ([ADR 0007](0007-an-invoice-number-comes-from-a-device-series.md))
are already per outlet.

Every query, policy and test pays for the extra keys now, even though each
tenant has exactly one outlet. A bug that ignores the outlet key will not show
up with one outlet. It shows up with the first chain, so tests should create
two outlets where the outlet boundary matters.

Hooks that nothing uses can rot. A column that is always the same value is
easy to fill wrongly without anyone noticing. Each hook should be written with
its MVP value deliberately, not left empty.

The rule depends on the line between a hook and a feature. That line has to be
argued case by case. Scope discipline (PRD §4 is the MVP and §6 is later) is
what keeps "just the hook" from growing into the feature.
