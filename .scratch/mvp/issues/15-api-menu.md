# 15 Menu API: CRUD, modifiers, stock, menu version, guest menu JSON, CSV import

Status: ready-for-agent
Type: task
Blocked by: 13
Workspaces: apps/api

## What

PRD M1–M5, TRD §5.3 Menu and §10 (menu JSON).

## Acceptance

- CRUD for categories, items, modifier groups/modifiers (variants = group with min=max=1, is_variant).
- Image upload: `sharp` to 400 px WebP, stored through an S3-compatible interface (R2 in prod, local disk/minio stub in dev).
- Toggling `in_stock` / `is_active` bumps `menu_versions` and emits `item.stock_changed` (notification only).
- `GET /api/v1/menu/:outletId?v=` returns one public JSON document with branding, cacheable (`Cache-Control` keyed by version).
- CSV import (it's on the cut list, so do it last and keep it simple): validate the whole file, all-or-nothing.
- Integration tests: version bump on stock change, inactive items absent from guest JSON, tenant isolation.
