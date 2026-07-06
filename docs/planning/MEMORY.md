# Repo Memory — Current State

> Mutable snapshot, replaced on update by the active project's orchestrator session. Last updated: **2026-07-06**. History: see the active plan's Session Log. How this directory works: [README.md](README.md).

## Active project

**July 2026 Modernization** — [2026-07-03-modernization-plan.md](2026-07-03-modernization-plan.md)

- **State**: Phases 1–5 merged and on-device verified (2026-07-04/05). Docs synced; design-system + operations-runbook docs exist. `npm audit` clean post-upgrades.
- **Remaining**: Phase 6 (Banff + PMTiles) — explicitly **post-trip**; scope and cold-start prompt are in the plan.
- **Merge freeze**: no merges to `main` after **2026-08-14** except verified fixes (Europe trip departs ~end of August 2026).

## Open items (non-blocking spot-checks)

- Installed-PWA update path + airplane-mode-across-restart re-check on the post-Phase-5 production build (do before the freeze).
- iOS Reduce Transparency / Reduce Motion toggles (verified via emulation only).
- Edit-export sanity check after the Phase 5 rewrite.
- Re-enable Netlify deploy previews (disabled since PR #2) before the next risky session.

## Next action

Nothing required before the trip. Post-trip: start Phase 6 via its cold-start prompt in the plan (Session F, Fable 5 worker).
