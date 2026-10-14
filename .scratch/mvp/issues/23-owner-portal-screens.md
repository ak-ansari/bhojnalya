# 23 Owner portal and super admin screens

Status: ready-for-agent
Type: task
Blocked by: 12, 14, 15
Workspaces: apps/admin

## What

The admin UI over the APIs from 14 and 15. Designs: `OwnerMenu`, `OwnerDashboard`, `AdminConsole`.

## Acceptance

- Owner: outlet settings (GSTIN, FSSAI, tax mode, price mode, prefix, KDS thresholds, auto-accept, day-end cutoff, KOT routing), menu management with modifiers/variants/stock/images, CSV import, device list with revoke, table QR print + rotate, unsynced-device list (US-OFF-14).
- Super admin: tenants/outlets/floors/tables, subscription + suspension, impersonation with red banner.
- Component tests per screen; one e2e for "owner marks item out of stock".
