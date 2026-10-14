# 22 Reports: Z-report, item/category/channel, GST, exports

Status: ready-for-agent
Type: task
Blocked by: 12, 17
Workspaces: apps/api, apps/admin

## What

PRD reporting requirements, TRD §14 (IST date ranges, day-end cutoff), §18 (Z-report < 2 s). Design: `OwnerReports.dc.html`.

## Acceptance

- Z-report per business day (cutoff-aware), item/category/channel sales, GST summary by rate, voids/cancellations with reasons, `needs_review` invoices.
- "Today" reads raw tables; past days read `daily_sales_rollup`, refreshed by a pg-boss job.
- CSV/XLSX export (streaming), stored through the object-storage interface with a time-limited link.
- Admin screens for each report. Dashboard widgets are on the cut list; keep them minimal.
- Integration test: business-date boundary at the cutoff in IST.
