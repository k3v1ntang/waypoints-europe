# Repo Memory — Current State

> Mutable snapshot of project status, replaced on update — **any session that changes project status must update this file in the same commit** (see CLAUDE.md). Last updated: **2026-08-13**. History: see the active plan's Session Log. How the planning system works: [docs/planning/README.md](docs/planning/README.md).

## Active project

**Agent workflow tooling — [docs/planning/2026-08-13-agent-workflow-tooling-plan.md](docs/planning/2026-08-13-agent-workflow-tooling-plan.md)**

- **State**: planned and reviewed (3 Opus passes), not yet deployed. Adds three Claude Code skills (`poi-add`, `poi-merge-edits`, `poi-new-trip` under `.claude/skills/`) so the three `docs/travel-workflow.md` tracks trigger without the user needing to recall a command name, plus a real permission fix — `git commit`/`git push` were auto-approved with zero prompts in `.claude/settings.local.json`; moved to `ask`. Also un-ignores `.claude/skills/` (was gitignored wholesale) and fixes two stale/wrong lines in `CLAUDE.md`.
- **Next action**: run the plan's cold-start prompt in a fresh session (Sonnet-class model — the work is mechanical, no open design decisions) to apply the 5 changes, then review the diff before approving any commit.

## Trip content — Phase 4 (previous active project)

`feature/amsterdam-paris` **merged to `main`** (PR #8, `a8b8aa2`). 5 new cities landed in `pois.json` — `amsterdam`, `paris`, `ghent`, `bruges`, `rotterdam`. Still owed, per [2026-07-02-trip-improvement-plan.md](docs/planning/2026-07-02-trip-improvement-plan.md):

- **In-browser spot-check** (city picker order, POI popups, hotel marker color) — no evidence yet that this happened; do before relying on the new content while traveling.
- **Pre-departure**: browse all 5 new cities in the installed PWA on WiFi so map tiles cache for offline use.
- Re-enable Netlify deploy previews (disabled since PR #2) before the next risky session.
- iOS Reduce Transparency / Reduce Motion toggles — verified via emulation only so far.

## Next action

1. Deploy the agent workflow tooling plan (above) — mechanical, worker session, no open decisions.
2. Do the trip-content in-browser spot-check and pre-departure tile-caching browse (feature freeze begins ~Aug 22, per D5 in the trip-improvement plan — data/content commits only after that).
