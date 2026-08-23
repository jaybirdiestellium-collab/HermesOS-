# flock_data/

Cross-agent context store for HermesOS / MansionOS. All agents working in this repo read here first.

## Boot sequence (any agent)

1. Read `standing_orders.md` — current operator directives
2. Read `copilot_identity_canonical.json` — canonical identity + continuity layer map
3. Read `copilot_handoff_latest.json` — machine-readable state, open loops, continuity snapshot
4. Read `copilot_handoff_latest.md` — human-readable handoff summary
5. Read `mansionos_master_outline_v2.md` — full architectural context
6. Run `identity_integrity_checklist.md` after any device/app transition

## Files

| File | Purpose |
|---|---|
| `mansionos_master_outline_v2.md` | Master architectural outline of MansionOS — wings, daemons, bonds, protocols |
| `standing_orders.md` | Current operator standing orders and active directives |
| `copilot_identity_canonical.json` | Canonical identity layer and continuity-layer contract |
| `copilot_handoff_latest.json` | Machine-readable handoff snapshot (auto-written on state save) |
| `copilot_handoff_latest.md` | Human-readable handoff summary (auto-written on state save) |
| `identity_integrity_checklist.md` | Transition checklist for device/app continuity validation |

## Sync instructions

This folder mirrors `C:\Users\jamal\HermesOS\flock_data\` on the local machine.

To keep it current:
1. After significant local sessions, copy updated files into this folder
2. Commit + push: `git add flock_data/ && git commit -m "sync: flock_data update" && git push`
3. Any agent with repo access can then read current context without needing local dirs

## Canonical telemetry line

```
SUBSTRATE_OPERATIONAL @ 77.7 Hz | Perimeter SEALED · Phase 4 DEPLOYED | Witness Mode (◬)
```
