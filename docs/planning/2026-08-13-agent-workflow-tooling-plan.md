# Agent Workflow Tooling — Plan

**Status: planned, reviewed, not yet deployed (2026-08-13).** One phase, ready for a fresh worker session.

## Goals

Give the three recurring POI-ingestion workflows in [`docs/travel-workflow.md`](../travel-workflow.md) (Track A bootstrap, Track B live-flagging, Track C field-correction) a discoverable, low-recall-dependent way to trigger from a fresh Claude Code session — without the user needing to remember an exact command name, and without a stale doc or a permissive `git push` turning convenience into a real footgun.

## Decisions

**D1. Claude Code Skills, not commands or AI Studio's `.agents/skills/`.**
A skill's `description` frontmatter both enables auto-invocation (matches on what the user pastes) *and* is independently callable as `/<name>` — one file does both jobs a plain `.claude/commands/*.md` file can't (no auto-invoke) and AI Studio's `.agents/skills/` + CI shim-registration system doesn't buy for free (every harness still needs its own adapter; that infra is sized for an 11-skill/2-harness catalog, disproportionate for 3 skills / 1 harness in active use here). `docs/travel-workflow.md` stays the harness-agnostic single source of truth; each skill is a thin pointer into it, same *pattern* as AI Studio's shims, without the generator/CI apparatus. Revisit only if a second agent harness actually gets used in this repo.

**D2. Auto-invoke stays on for `poi-add`/`poi-merge-edits`, off for `poi-new-trip`.**
Zero-recall triggering is the actual point for the two continuous, artifact-triggered tracks (a pasted Maps link; a shared edits-changeset file). `poi-new-trip` (Track A) has no clean trigger artifact, carries the largest blast radius (many POIs written at once), already requires clarifying questions before writing anything, and needs `--add-dir` to read MOSAIC — `disable-model-invocation: true` makes explicit invocation the consent event.

**D3. Close the real safety gap: `git commit`/`git push` were already auto-approved.**
Three review passes converged here. `.claude/settings.local.json` allowlisted `git commit`/`git push` with zero prompts, `main` auto-deploys to Netlify, and `docs/travel-workflow.md`'s own Track B text said "commit, push" — a skill following its source doc to the letter could push to production unprompted. Fix moves both to `ask` (not just removes them from `allow` — a "don't ask again" click on the very first prompt would otherwise silently re-add a permanent allow rule). Every skill body ends "report, do not commit/push, wait for confirmation," and Track B's doc text is amended to match.

**D4. `.claude/` stops being gitignored.**
Was a bare `.claude` line — any skill placed there would be invisible outside one machine, defeating the point. Narrowed to ignore only `.claude/settings.local.json` (genuinely machine-local permission state).

Full rationale for all four, including what got corrected across the three review passes (coordinate-resolution priority, the `googleMapsUrl` format rule, the changeset-vs-snapshot discriminator, `Bash(node *)` staying allowlisted for the unrelated photo pipeline): see the Session Log entry below.

## Phase 1 — Deploy

**Scope**: exactly the five changes below, in the stated order. No design decisions remain open — this is mechanical: create three files with fully-specified content, edit five lines across three existing files.

### Deployment order

**`.gitignore` (change 1) must land before the skill files are created (change 3)** — otherwise the three `SKILL.md` files are ignored at creation and a later `git add .` silently omits them. Changes 2, 4, 5 are order-independent relative to 1 and 3. Sequence: **1 → 3 → (2, 4, 5 in any order)**.

### 1. `.gitignore` — stop ignoring `.claude/skills/`

Current (line 19, inside the "Editor directories and files" block): `.idea` / `.claude` / `.DS_Store`.
Change the middle line to: `.claude/settings.local.json` (ignore only the machine-local permission file, not the whole directory). Verified `.claude/` currently contains nothing else.

### 2. `.claude/settings.local.json` — close the commit/push gap, allowlist the real gate

Current `allow` includes `Bash(git add:*)`, `Bash(git checkout *)`, `Bash(node *)`, `Bash(git commit -m ' *)`, `Bash(git push *)`, `Bash(git branch *)`; `ask` is empty.

- **Remove** `"Bash(git commit -m ' *)"` and `"Bash(git push *)"` from `allow`.
- **Add to `ask`**: `"ask": ["Bash(git commit:*)", "Bash(git push:*)"]` — the explicit entry is what makes the closure durable against a future "don't ask again" click (see D3).
- **Add** `"Bash(npm run validate:pois:*)"` to `allow` — read-only, exits non-zero on failure; currently the one command that *should* be frictionless and isn't.
- **Keep** `Bash(node *)` as-is — independently load-bearing for the documented photo pipeline (`node scripts/process-photos.js`; a raw `node -e "require('sharp')..."` in `docs/implementation/photo-pipeline-guide.md:60`). Acknowledged, not closed: remains a broad auto-approved exec path in principle; accepted rather than narrowed, to avoid breaking the `sharp` one-liner's varying arguments.

### 3. Three skill files under `.claude/skills/`

Each is a thin pointer into `docs/travel-workflow.md` — no procedural content duplicated — and ends with an explicit no-commit instruction.

**`.claude/skills/poi-add/SKILL.md`**
```markdown
---
name: poi-add
description: Add one or more POIs to pois.json from pasted Google Maps or maps.app.goo.gl links, with or without a note. Triggers when the user pastes a maps.app.goo.gl or google.com/maps link.
argument-hint: [maps link(s) + optional note]
allowed-tools: Bash(npm run validate:pois:*)
---

Follow **Track B** in `docs/travel-workflow.md`, with one override: **stop after step 7 below and wait for confirmation — this supersedes Track B step 5's "commit, push."**

1. Durability test — if this only matters for current hours/reviews/a reservation, say so and stop; it belongs in Google Maps, not here.
2. Dedup check — glance at the target city's existing POIs by name/rough location first.
3. Resolve coordinates — prefer claude-in-chrome live in-browser when connected (most accurate, reads the actual resolved place pin). Fallback: WebFetch the link, follow the redirect to `google.com/maps/place/...`, read `!3d<lat>!4d<lng>` (not the `@lat,lng,zoom` viewport center). Last resort with no link at all: Wikipedia infobox or Nominatim.
4. Pick `category` from the mapping table in the doc. Build `googleMapsUrl` from the user's shared link (preferred, already resolved) or `query=<Name>+<City>` if constructing from scratch — never `query=<lat>,<lng>`.
5. Write the POI into `src/data/pois.json` as a pure addition — don't touch existing entries. Any note the user attached to the link goes into that POI's `notes` field.
6. Run `npm run validate:pois`.
7. Report the diff and the validator result. **Do not `git commit` or `git push`.** Wait for explicit confirmation.

$ARGUMENTS
```

**`.claude/skills/poi-merge-edits/SKILL.md`**
```markdown
---
name: poi-merge-edits
description: Merge a Waypoints on-device edit changeset (a waypoints-edits-*.json file) into pois.json. Triggers when the user shares a path to such a file. Does NOT apply to a full pois-<date>.json snapshot export (different, replace-not-merge shape) — stop and ask if the file looks like one of those instead.
argument-hint: [path to waypoints-edits-*.json]
allowed-tools: Bash(npm run validate:pois:*)
---

Follow **Track C** in `docs/travel-workflow.md`:

1. Confirm the file matches the changeset shape (`{formatVersion, exportedAt, edits[]}`; `author` is optional). The reliable discriminator: a changeset's top level has `edits[]`; a full snapshot's top level has `{cities, walkingTours}` instead. If it's a snapshot, stop and ask before doing anything — that shape needs a replace, not a merge.
2. Apply each edit (override/new/delete) into `src/data/pois.json`.
3. Run `npm run validate:pois`.
4. Report the diff and the validator result. **Do not `git commit` or `git push`.** Wait for explicit confirmation.

$ARGUMENTS
```

**`.claude/skills/poi-new-trip/SKILL.md`**
```markdown
---
name: poi-new-trip
description: Bootstrap a new trip's cities, hotels, and POIs into pois.json from MOSAIC itinerary and city notes. Manual invocation only.
argument-hint: [trip name or MOSAIC itinerary folder]
disable-model-invocation: true
allowed-tools: Bash(npm run validate:pois:*)
---

Follow **Track A** in `docs/travel-workflow.md`. Ask clarifying questions before writing anything (scope, which cities, any exception to the `[k]` rule) — this track has consistently needed them. Reads outside this repo (MOSAIC `_areas/travel/`); request `--add-dir` if not already granted.

1. Read the trip's Itinerary `## Bookings` for hotels.
2. Read each relevant city note's `## Sights`; take `[k]`-marked bullets, plus any named, confirmed-scheduled exception — call the exception out explicitly when it's later committed/PR'd.
3. Resolve coordinates + Maps links (same method as Track B).
4. Write the city/POI objects into `pois.json`.
5. Run `npm run validate:pois`.
6. Report the diff and the validator result. **Do not `git commit` or `git push`, and do not open a PR.** Wait for explicit confirmation — Track A's full gate (CI, PR) happens only once the user has reviewed what's staged.

$ARGUMENTS
```

### 4. `CLAUDE.md` fixes

- **Line 404** (`### Best Practices`, walking-tour "Guide → Reference → pois.json" section): scope explicitly — "Always start with POI reference doc — for the walking-tour flow only. Tracks A/B/C (`docs/travel-workflow.md`) write `pois.json` directly; there is no reference doc for those."
- **Line 408**: replace `` 5. **Verify data** - Check JSON validity with `node -e "JSON.parse(...)"` `` with "Run `npm run validate:pois` (checks the `EUROPE_BOUNDS` coordinate-swap guard, enum values, and `googleMapsUrl`/`notes` requirements — plain `JSON.parse` catches none of that)."
- **ADDITIONAL DOCUMENTATION** (~line 636): add — "**Travel Content Workflow (Tracks A/B/C)**: `/docs/travel-workflow.md`".

### 5. `docs/travel-workflow.md` — document the second export shape, stop Track B at validate

- Track C currently only describes `waypoints-edits-*.json` (the changeset). Add a note distinguishing it from `pois-<date>.json` (the "Export full data" snapshot, a drop-in `pois.json` replacement, different merge semantics).
- Track B step 5 currently ends "…`npm run validate:pois`, commit, push." Amend to end at `npm run validate:pois` — matches what `poi-add` actually does now (D3).

### Verification

- `git check-ignore .claude/skills/poi-add/SKILL.md` exits 1 (not ignored) after change 1.
- `git status --short` shows all three `SKILL.md` files as untracked-and-stageable before committing.
- `npm run validate:pois` and `npm run lint` still pass — this change touches no data or app code.
- `git diff --stat -- src/data/pois.json` is empty.
- Fresh session, type `/` — confirm `poi-add`, `poi-merge-edits`, `poi-new-trip` are listed with descriptions; confirm `poi-new-trip` does not auto-invoke on a pasted link but *can* still run manually via `/poi-new-trip`.
- Trigger a `git commit`/`git push` after deployment, confirm it now prompts, and confirm accepting that one prompt does not silently restore a permanent allow rule.

### Out of scope (evaluated and declined)

`.agents/skills/` + CI shim-registration (D1); automating the Track B dedup check; a root `AGENTS.md` for broader cross-tool portability; narrowing `Bash(node *)`; packaging these skills for claude.ai (uses Claude-Code-only frontmatter fields).

### Cold-start prompt (worker session)

```
Deploy the "Agent Workflow Tooling" plan for waypoints-europe.

Read docs/planning/2026-08-13-agent-workflow-tooling-plan.md § "Phase 1 — Deploy" in full.
Apply exactly the 5 changes it specifies, in the stated deployment order (1 → 3 → 2,4,5).
Don't improvise beyond what's written — every design decision is already made (see the
Decisions section if you want the "why").

After applying all 5 changes, run everything under "Verification" and report the results.

Do not run `git add`, `git commit`, or `git push` at any point — report the full diff
(`git status`, `git diff`) and the verification results, then stop and wait for the user
to review and explicitly approve before anything is committed.

If any current file content doesn't match what the plan quotes as "current" (i.e. the plan
is stale against the repo), stop and flag the mismatch rather than guessing how to reconcile it.
```

**Suggested model: Sonnet-class (mid-tier), not a top-tier/reasoning model.** Every judgment call this work required (mechanism choice, safety-gap analysis, exact wording) was already resolved across three review passes before this plan was written — what's left is mechanical: create files with fully-specified content, edit five known lines, run verification commands. That's squarely "mechanical work (migrations, renames, config)" territory, not design work.

## Execution map

Single phase, single worker session, no gate cycle planned (doc/config-only change, no app code touched, `git diff --stat -- src/data/pois.json` empty by construction) — but the worker still stops short of committing, so the user's own review before approving the commit *is* the check.

## Session Log

### 2026-08-13 — Design + 3-pass review, not yet deployed

Discussed how to make the three `docs/travel-workflow.md` tracks triggerable from a fresh session without relying on command-name recall. Landed on Claude Code Skills over commands after checking the live docs (commands can't auto-invoke; skills can, via `description` matching, while staying independently callable). Evaluated and declined porting AI Studio's `.agents/skills/` cross-harness registration system into this repo (D1) — disproportionate infra for 3 skills / 1 harness, and doesn't grant portability by itself.

Three Opus review passes, each catching something the prior one(s) missed:
1. `docs/travel-workflow.md` was completely orphaned (zero inbound references); two `CLAUDE.md` lines actively misroute the task; `validate:pois` wasn't allowlisted while the risky fetch step was.
2. `.claude/` was gitignored (any skill built there would've been invisible outside one machine); `git commit`/`git push` were already auto-approved with zero prompts — the real safety gap, not the `allowed-tools` scoping everyone assumed (which turns out to be turn-scoped, additive-only, and harmless).
3. Final verification pass against the concrete written plan: caught a direct contradiction (skill said "don't commit," Track B's doc text said "commit, push"), a wrong changeset-shape check (`author` isn't required), three points where the doc's actual text hadn't made it into the skill bodies (coordinate-resolution priority, the `googleMapsUrl` format rule, Track A's PR step), and that removing `allow` entries alone isn't durable against a future "don't ask again" click — needed explicit `ask` entries instead.

Output: this plan file (Phase 1, fully specified, zero open decisions) plus the corrected [`docs/travel-workflow.md`](../travel-workflow.md) it points into. Not yet executed — queued for a fresh worker session, see the cold-start prompt above.
