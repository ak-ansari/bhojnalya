# 28 POS shell: bad stored role and chunk-load failures (QA round 1)

Status: ready-for-agent
Type: bug
Blocked by: 16
Workspaces: apps/app

QA round 1 on development @ cdcf87a. Probes: `/private/tmp/claude-501/-Users-akansari-projects-bhojnalya/947da6ab-097f-41ff-891f-25d045e1c00f/scratchpad/ui/`. Each fix starts with a red test.

1. localStorage `bhojnalya.device` = `{"state":{"role":"admin"},"version":0}` (or role 123) shows a blank `/kds` with no way out. `roleHome()` maps any non-'pos' value to `/kds` and `RequireRole` never matches. Validate the persisted role with the contracts `DeviceRole` schema and fall back to `/register`.
2. No `errorElement`: a failed lazy chunk (offline, or a stale client after deploy) shows React Router's raw "Unexpected Application Error!". Add a branded, translated fallback that offers a reload, and never loses unsynced data (it must not clear storage).
