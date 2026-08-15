# Repo Memory — Current State

> Mutable snapshot of project status, replaced on update — **any session that changes project status must update this file in the same commit** (see CLAUDE.md). Last updated: **2026-08-14**. History: see the active plan's Session Log. How the planning system works: [docs/planning/README.md](docs/planning/README.md).

## Active project

None. The next standing task is the trip-content pre-departure checklist under "Next action" below.

## Visited POI (previous active project)

[docs/planning/2026-08-14-visited-poi-plan.md](docs/planning/2026-08-14-visited-poi-plan.md) — **implemented and merged to `main`.** Personal `visited` field on the POI object (`pois.json`), toggled from the POI popup or the editor sheet, merged through the existing edit-overlay/multi-device-merge machinery (also fixed two real bugs in `scripts/detect-edit-conflicts.ts`, D4/D5, that would otherwise have silently dropped or reverted the flag on a two-device merge). A "Hide visited places" toggle in the ⋯ menu **defaults ON** (flipped from the plan's original default-OFF during review, for trip-usage convenience across a phone/iPad/occasional-reinstall workflow — see the plan's Session Log for the full trade-off). Visited markers are color-only (green) on the map; the plan's original opacity/size secondary signal was dropped after on-device review (MapLibre's `circle-opacity` let map labels show through the marker). 3 real POIs currently marked visited (`paris-palace-of-versailles`, `amsterdam-w-amsterdam`, `paris-citadines-les-halles`).

## Agent workflow tooling (previous active project)

[docs/planning/2026-08-13-agent-workflow-tooling-plan.md](docs/planning/2026-08-13-agent-workflow-tooling-plan.md) — **both phases deployed and committed.** Phase 1 (`6e2337b`) added three Claude Code skills (`poi-add`, `poi-merge-edits`, `poi-new-trip` under `.claude/skills/`) so the three `docs/travel-workflow.md` tracks trigger without the user needing to recall a command name, plus a real permission fix — `git commit`/`git push` were auto-approved with zero prompts in `.claude/settings.local.json`; moved to `ask`. Phase 2 adds `scripts/detect-edit-conflicts.ts` — a deterministic field-level diff/merge for two partners' independently-exported `waypoints-edits-*.json` changesets touching the same POI, wired into the `poi-merge-edits` skill and `docs/travel-workflow.md` Track C. Nothing open on this plan; revisit only if usage surfaces a real gap (e.g. the accepted "not a three-way merge" residual risk, or the deferred `photos`-union logic).

## Trip content — Phase 4 (previous active project)

`feature/amsterdam-paris` **merged to `main`** (PR #8, `a8b8aa2`). 5 new cities landed in `pois.json` — `amsterdam`, `paris`, `ghent`, `bruges`, `rotterdam`. Still owed, per [2026-07-02-trip-improvement-plan.md](docs/planning/2026-07-02-trip-improvement-plan.md):

- **In-browser spot-check** (city picker order, POI popups, hotel marker color) — no evidence yet that this happened; do before relying on the new content while traveling.
- **Pre-departure**: browse all 5 new cities in the installed PWA on WiFi so map tiles cache for offline use.
- Re-enable Netlify deploy previews (disabled since PR #2) before the next risky session.
- iOS Reduce Transparency / Reduce Motion toggles — verified via emulation only so far.

## Next action

1. Do the trip-content in-browser spot-check and pre-departure tile-caching browse (feature freeze begins ~Aug 22, per D5 in the trip-improvement plan — data/content commits only after that).
