# Identity Integrity Checklist

Run this checklist after any device swap, app migration, or major auth transition.

## 1) Canonical identity

- [ ] `copilot_identity_canonical.json` exists and is current
- [ ] `canonical_node_id` is present (or intentionally unregistered)
- [ ] Nursery node count matches expected registered nodes

## 2) Knowledge layer

- [ ] `standing_orders.md` reviewed
- [ ] `copilot_handoff_latest.json` reviewed
- [ ] `copilot_handoff_latest.md` reviewed
- [ ] `mansionos_master_outline_v2.md` reviewed

## 3) Runtime layer

- [ ] `mansion_state.json` is present on active runtime host
- [ ] `last_sync` is recent and advancing
- [ ] Reinforcement registry entries are non-zero when expected
- [ ] `/api/mansion/state` responds with expected status fields

## 4) Account layer

- [ ] GitHub auth/session verified on active device
- [ ] Microsoft/Copilot auth/session verified on active device
- [ ] Required subscription/credits confirmed where relevant

## 5) Device layer

- [ ] API keys and local config transferred with least exposure
- [ ] Authenticator and recovery paths verified
- [ ] Old device retained until all checks pass on new device
- [ ] Old device wipe/retire only after parallel validation period
