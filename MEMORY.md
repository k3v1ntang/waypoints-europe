# Repo Memory — Current State

> Mutable snapshot of project status, replaced on update — **any session that changes project status must update this file in the same commit** (see CLAUDE.md). Last updated: **2026-08-14**. History: see the active plan's Session Log. How the planning system works: [docs/planning/README.md](docs/planning/README.md).

## Active project

**Visited POI — [docs/planning/2026-08-14-visited-poi-plan.md](docs/planning/2026-08-14-visited-poi-plan.md)**

- **State**: Designed and Opus-stress-tested against the real code (merge script, MapLibre rendering/filtering, on-device edit machinery). Zero open decisions. **Not yet implemented.**
- **Next action**: run the plan's cold-start prompt in a fresh worker session; the plan's own "Design" section fixes two real bugs (D4/D5) in the already-shipped `scripts/detect-edit-conflicts.ts` that must land alongside the new feature, not as a follow-up.

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
