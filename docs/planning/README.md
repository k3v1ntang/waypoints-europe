# Planning Docs — How This Directory Works

Describes the planning system for this repo. For **current status**, read [`/MEMORY.md` at the repo root](../../MEMORY.md) — this file is descriptive and changes rarely.

## Structure

- **`/MEMORY.md` (repo root)** — the mutable now-snapshot: active project, one-line state, freeze dates, open items. The only file that tracks status. Any session whose work changes status updates it in the same commit; replaced on update (history lives in each plan's Session Log, never there).
- **`YYYY-MM-DD-<name>-plan.md`** — one dated plan per project: goals, decisions with rationale, phases with cold-start prompts, an execution map, and an orchestrator-maintained Session Log. A plan is the single source of truth for its own project's status (status line + ✅ phase marks + Session Log). Completed plans stay in place as historical records — they are never rewritten, only appended to.
- **`YYYY-MM-DD-session-<x>-notes.md`** — working records from individual implementation sessions (deviations, findings). Referenced from their plan's Session Log.

## Plans

- [2026-07-03-modernization-plan.md](2026-07-03-modernization-plan.md) — July 2026 modernization: security hardening, Mapbox→MapLibre, dependency majors + tests, TypeScript, Liquid Glass UX rebuild, Banff/PMTiles (Phase 6). Defines the orchestrator/worker session model in its §5.
- [2026-07-02-trip-improvement-plan.md](2026-07-02-trip-improvement-plan.md) — trip content, POI editing, and photo pipeline improvements.

## Conventions

1. New project = new dated plan file + an entry in `/MEMORY.md` + a line in the list above. CLAUDE.md never needs editing for this.
2. Status belongs in exactly two places: the plan that owns it (detail) and `/MEMORY.md` (one-line snapshot). Nowhere else, including CLAUDE.md and this file.
3. Plan edits (status marks, Session Log, decision amendments) belong to the orchestrator session defined in the active plan; implementation sessions end with a Session Report instead of editing the plan.
