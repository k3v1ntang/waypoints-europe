# Repo Memory — Current State

> Mutable snapshot of project status, replaced on update — **any session that changes project status must update this file in the same commit** (see CLAUDE.md). Last updated: **2026-08-13**. History: see the active plan's Session Log. How the planning system works: [docs/planning/README.md](docs/planning/README.md).

## Active project

**Agent workflow tooling — [docs/planning/2026-08-13-agent-workflow-tooling-plan.md](docs/planning/2026-08-13-agent-workflow-tooling-plan.md)**

- **State**: **Phase 1 deployed to the working tree, not yet committed.** Adds three Claude Code skills (`poi-add`, `poi-merge-edits`, `poi-new-trip` under `.claude/skills/`) so the three `docs/travel-workflow.md` tracks trigger without the user needing to recall a command name, plus a real permission fix — `git commit`/`git push` were auto-approved with zero prompts in `.claude/settings.local.json`; moved to `ask`. Also un-ignores `.claude/skills/` (was gitignored wholesale) and fixes two stale/wrong lines in `CLAUDE.md`. Verification passed (`validate:pois`, `lint`, untracked-file checks); `git status`/`git diff` reported to the user, awaiting explicit commit approval.
- **Phase 2 planned, Opus-stress-tested, not yet deployed**: `poi-merge-edits` currently assumes one changeset file; in practice both partners export their own, and two files touching the same POI silently last-write-wins today. Phase 2 adds `scripts/detect-edit-conflicts.ts` — a deterministic field-level diff that auto-merges non-overlapping edits and flags genuine value conflicts for review. A stress-test pass caught two real bugs before implementation (a device re-exporting a stale `new` record forever after its POI syncs; an optional-field wipeout on `walkingTourNotes`/`photos`) — both fixed in the plan.
- **Next action**: (1) review Phase 1's diff and approve the commit; (2) run Phase 2's cold-start prompt (plan § "Phase 2") in a fresh session to implement `detect-edit-conflicts.ts`.

## Trip content — Phase 4 (previous active project)

`feature/amsterdam-paris` **merged to `main`** (PR #8, `a8b8aa2`). 5 new cities landed in `pois.json` — `amsterdam`, `paris`, `ghent`, `bruges`, `rotterdam`. Still owed, per [2026-07-02-trip-improvement-plan.md](docs/planning/2026-07-02-trip-improvement-plan.md):

- **In-browser spot-check** (city picker order, POI popups, hotel marker color) — no evidence yet that this happened; do before relying on the new content while traveling.
- **Pre-departure**: browse all 5 new cities in the installed PWA on WiFi so map tiles cache for offline use.
- Re-enable Netlify deploy previews (disabled since PR #2) before the next risky session.
- iOS Reduce Transparency / Reduce Motion toggles — verified via emulation only so far.

## Next action

1. Review and commit Phase 1 of the agent workflow tooling plan (already deployed to the working tree, above) — then run Phase 2's cold-start prompt in a fresh session.
2. Do the trip-content in-browser spot-check and pre-departure tile-caching browse (feature freeze begins ~Aug 22, per D5 in the trip-improvement plan — data/content commits only after that).
