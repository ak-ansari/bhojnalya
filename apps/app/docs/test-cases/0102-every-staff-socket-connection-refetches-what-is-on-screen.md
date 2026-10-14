---
type: Test Case
title: "102. Every staff socket connection refetches what is on screen"
description: Protects the kitchen and the counter from a stale screen after missing real-time events while disconnected.
tags: [test-cases, real-time, shell]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 102. Every staff socket connection refetches what is on screen

Date: 2026-10-14

## Status

Proposed

## Given

- A screen showing data it fetched from the server.
- The device's real-time connection to the server.

## When

1. The real-time connection is made, or made again after a drop.
2. Later, the screen stops listening (it unmounts or the device role is
   cleared).

## Then

- **Each connection, the first included, marks everything on screen as
  stale and refetches it.** Events sent while the device was away are lost,
  so only a refetch brings the screen up to date. The first connection
  counts because a device that started offline has nothing fresh to show.
- After the screen stops listening, a connection refetches nothing.
- No connection is opened before the device has a role.
- Individual events invalidating their own data: **not built** (no events are
  sent yet).

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/app test -- staffSocket`

### Verify

Both `refetchOnReconnect` tests pass.

## Coverage

- `refetchOnReconnect › refetches what is on screen each time the socket connects` (component, MSW)
- `refetchOnReconnect › stops refetching once unsubscribed` (component, MSW)
- No connection before the device has a role: **GAP**, no test drives the
  provider with a socket.
- Against the real server's socket (e2e): **GAP**, the server has no socket
  namespace yet.

Command: `pnpm --filter @bhojnalya/app test`

## References

- [ADR 0010 A socket event is a notification, not data](../../../../docs/decisions/0010-a-socket-event-is-a-notification-not-data.md)
