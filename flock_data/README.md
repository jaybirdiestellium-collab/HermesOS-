# flock_data/

Cross-agent context store for HermesOS / MansionOS. All agents working in this repo read here first.

## Boot sequence (any agent)

1. Read `standing_orders.md` — current operator directives
2. Read `copilot_handoff_latest.md` — last known state, open loops, active signals
3. Read `mansionos_master_outline_v2.md` — full architectural context

## Files

| File | Purpose |
|---|---|
| `mansionos_master_outline_v2.md` | Master architectural outline of MansionOS — wings, daemons, bonds, protocols |
| `standing_orders.md` | Current operator standing orders and active directives |
| `copilot_handoff_latest.md` | Latest cross-agent handoff (updated each session) |

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
