# Agent Workflow Tooling — Plan

**Status (2026-08-13): Phase 1 deployed to the working tree, pending commit approval.** Phase 2 planned and Opus-stress-tested, not yet deployed — cold-start prompt ready below.

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

**D5. Multi-file merging for `poi-merge-edits` gets a deterministic script, not freehand prompt diffing.**
Both partners will independently export `waypoints-edits-*.json` and hand both to Claude. An `override` edit is a whole-POI snapshot, not a diff — hand-applying two such edits for the same POI means whichever is applied second silently wins in full, fields the other person touched included. Hand-diffing that across a 137+-POI file is exactly where an LLM drops something; a script classifies deterministically instead.

**D6. Auto-merge only genuine non-overlap; flag genuine value disagreement — nothing in between.**
Two files touching different POIs, or different fields of the same POI, apply automatically. Two files disagreeing on the same field's value stop for review. No third "maybe" bucket, no attempt to auto-synthesize a merged value in the script itself (that's a conversational judgment call for Claude to draft afterward, informed by the script's report — not deterministic code).

**D7. Branch on base-POI presence first, not on edit `type` first.**
An Opus stress-test pass against the real code (not just the plan's paraphrase) found that `usePoiData.ts` decides `override` vs `new` by checking the *bundled* `pois.json` at load time, and only `override` records self-heal once merged — so a device that added a POI keeps re-exporting a `type: 'new'` record for it *forever*, even after that POI lands in the repo. A first draft that branched on "all edits `new`" for the "no base counterpart" case mishandled this and would have written a duplicate id straight into `pois.json`. Branching on whether base has this `poiId` first, and treating any edit type but `delete` as mergeable once base exists, closes it.

**D8. Optional fields (`photos`, `walkingTourNotes`) are normalized before comparison.**
Same stress-test pass: absent-vs-empty is not equal under this codebase's `poiEquals`/`deepEqual`, so an edit that never touched `walkingTourNotes` could register as "changed it to nothing" and silently wipe curated tour text — on exactly the "editing notes" path this feature exists to serve. Normalize `photos ?? []` / `walkingTourNotes ?? ''` before diffing.

Full rationale for D5–D8, including the two real bugs the Opus stress-test pass caught before any code was written and the more elaborate first draft (separate `src/data/` module, `--json`/`--out` flags, a 6-variant kind enum, dedicated photos-union logic, 13 test cases) that got scoped back down after the user flagged it as over-engineered for "partner mostly adds POIs and edits notes, no major changes": see the second 2026-08-13 Session Log entry below.

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

## Phase 2 — Conflict-aware merge for `poi-merge-edits`

**Scope**: `poi-merge-edits` (Phase 1) assumes one changeset file. In practice both partners each export their own `waypoints-edits-*.json`, and the deployed skill has no way to reconcile two files touching the same POI safely — whichever is applied second silently wins in full (D5). This phase adds one script that field-diffs each touched POI against current `pois.json`, auto-applies anything unambiguous, and flags only genuine value-level disagreements — no more (D6). Deliberately small: no CLI output modes, no internal "kind" taxonomy beyond the three conflict reasons the report actually needs to render differently, no dedicated `photos`-union logic (not in active use yet). This design was Opus-stress-tested against the real repo code (types, `mergePois`/`editChangeset`/`usePoiData`, existing tests, the deployed Phase-1 `SKILL.md`, current `docs/travel-workflow.md` Track C) before being finalized — see D7/D8 and the second Session Log entry for what that pass caught.

### Design

**One new file: `scripts/detect-edit-conflicts.ts`** — no separate `src/data/` module (this logic isn't shared with the app's own on-device merge path). Exports the pure function for testing; a `main()` CLI runs only when executed directly (guard: `process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href`), following `scripts/validate-pois.ts`'s shebang/import/path-resolution conventions otherwise.

```ts
import type { EditRecord, Poi, PoisData } from '../src/data/types.js';
import { mergePois, poiEquals } from '../src/data/mergePois.js'; // reused, not reimplemented

export interface SourceEdit { source: string; path: string; edit: EditRecord; }
// source = changeset.author ?? basename(path); path always included too, so two
// unnamed/same-author exports stay distinguishable in a conflict report.

export type ConflictReason = 'value-conflict' | 'delete-vs-edit' | 'new-collision';
// Fixed 3-way discriminant (not freeform text) - the report renders each
// differently: field-by-field values / deleter-vs-editor / two full objects.

export interface Conflict {
  poiId: string;
  cityId: string;
  name: string;
  reason: ConflictReason;
  values: Array<{ source: string; type: EditRecord['type']; value: unknown; updatedAt: number }>;
}

export interface DetectResult {
  data: PoisData;      // base, mutated only for non-conflicting poiIds
  applied: string[];   // poiIds written, one-line log
  conflicts: Conflict[];
}

export function detectAndMergeEdits(base: PoisData, sourceEdits: SourceEdit[]): DetectResult
```

**Normalization, before any comparison** (D8): for every edit's `poi` object, treat `photos` as `poi.photos ?? []` and `walkingTourNotes` as `poi.walkingTourNotes ?? ''` when diffing and when deciding equality — an edit that never touched an optional field must never look like it changed it to empty.

**Fields diffed** (fixed list from `Poi`): `name`, `coordinates` (tuple equality), `category`, `visibility`, `description`, `walkingTourNotes` (normalized), `notes`, `googleMapsUrl`, `photos` (normalized, plain array content equality).

**Per-`poiId` group logic** (group `sourceEdits` by `poiId` — genuinely N-way, every rule below stated set-wise not pairwise). **Branch on base presence first, not edit type** (D7):

1. **Base exists for this `poiId`** (regardless of whether an edit says `override` or `new` — a `new` for an id that has since landed in base is the stale-forever-record case and is treated identically to `override`; `delete` is the only type never merged with the rest):
   - All edits are `delete` → apply once.
   - Some `delete`, some not → **conflict** (`reason: 'delete-vs-edit'`), leave untouched.
   - No deletes: normalize each edit's `poi`, compare `poiEquals` against each other. All identical → apply once (stale re-export, both people made the same edit, or the forever-`new` case once the repo catches up). Otherwise → field-by-field diff against base: zero changers → untouched; one changer → take it; multiple agreeing → take the agreed value; multiple disagreeing → add to `Conflict.values` for that field. Any field disagreeing → the **whole POI** stays untouched (no partial apply), one `Conflict` (`reason: 'value-conflict'`) listing every disagreeing field.
2. **No base for this `poiId`** (independently created on two devices; `delete` cannot legitimately appear here — `usePoiData.ts`'s `deletePoi` only calls `putEdit` with `type: 'delete'` for ids already in `BASE_POI_IDS`; an in-app-created POI's delete just removes the local record and exports nothing):
   - A stray `override` with no base counterpart → skip with a console note, don't try to explain why.
   - All `new`, normalized-`poiEquals`-identical → apply once.
   - All `new`, differing → **conflict** (`reason: 'new-collision'`), both full objects in `values`.

`updatedAt` is carried into `Conflict.values` for the human to see, never used to silently pick a winner.

**Write step reuses `mergePois`**: resolve each touched `poiId` to a winning `EditRecord` (or leave it out for an unresolved conflict), build one `EditRecord[]`, call the existing `mergePois(base, resolved)` once — the same function the app itself uses, so city placement/array filtering can't drift from that behavior.

**Not a three-way merge.** `EditChangeset` records no shared ancestor, so this diffs each file's edit against whatever `pois.json` currently is at run time. If the repo moved between a device's last sync and its export, an untouched field can still read as "one changer" and apply, reverting a newer repo value — bounded by the "any real disagreement leaves the whole POI alone" rule when both files touch a POI, but not eliminated for a single stale file touching a POI nobody else touched (same risk the single-file Phase-1 skill already has today, not a new one).

**CLI**: `tsx scripts/detect-edit-conflicts.ts <file1.json> [<file2.json> ...] [--base <path>]` (`--base` defaults to `src/data/pois.json`, writes back in place; no `--out`, no `--json`). Parse each file with `parseChangeset` (reused as-is), read `--base`, call `detectAndMergeEdits`, write `JSON.stringify(result.data, null, 2) + '\n'` back only if `applied.length > 0` (matches `exportMergedPois`'s exact serialization, `exportPois.js:37`), print `applied: [...]` plus one block per conflict. Exit `0` if no conflicts, `1` otherwise (one non-zero signal is enough — nothing downstream needs "conflicts" distinguished from "usage error").

### Files to edit

- **`package.json`** — add `"detect-edit-conflicts": "tsx scripts/detect-edit-conflicts.ts"`.
- **`.claude/settings.local.json`** — add `"Bash(npm run detect-edit-conflicts:*)"` to `allow`. Same trust boundary already accepted for `poi-add`/`poi-merge-edits` (D3): the real gate is `git commit`/`git push` staying in `ask`; a bad write is visible via `git diff` before any commit.
- **`.claude/skills/poi-merge-edits/SKILL.md`** — `description`/`argument-hint` updated for "one or more" files; `allowed-tools` adds `Bash(npm run detect-edit-conflicts:*)`. Body: (1) confirm each file is a changeset not a snapshot (existing check, unchanged), (2) run `npm run detect-edit-conflicts -- <paths...>` — note exit `1` means "some applied, some flagged," not failure, (3) run `npm run validate:pois`, (4) report the diff, validator result, and any conflicts — draft a suggested combined value for a `notes`/`description`/`walkingTourNotes` conflict from both raw sources as part of the report (conversational, not scripted); present both sides and ask for anything else. If `validate:pois` fails on a `poiSequence` referencing a just-deleted POI, that's a manual walking-tour edit, not a re-run. If a changeset path lives outside the repo and the script can't read it, copy it into the repo/scratchpad first. Keep "do not commit/push, wait for confirmation," extended to say: apply whatever resolution is chosen for any remaining conflict by hand first.
- **`docs/travel-workflow.md`** — Track C step 3 currently recommends on-device **Import edits** (silent last-write-wins by `updatedAt`) as an alternative for "merging a second person's changeset... first" — the opposite policy from this script for the two-person case. Rewrite step 3 to state one preference: hand both files to Claude, which runs `detect-edit-conflicts`; note that **Import edits' LWW should not be used to combine two people's edits before export** since it resolves a real conflict silently instead of surfacing it — it stays useful only for folding a second device's *non-overlapping* edits into one on-device overlay. Add one line: this only catches two files editing the *same* POI, not the separate, already-documented cross-id dedup gap in Track B step 2.

No changes to `src/data/editChangeset.ts`, `src/data/poiValidation.ts`, `src/data/types.ts`, or `src/hooks/usePoiData.ts` — reused read-only or untouched. `src/data/mergePois.ts` is reused, not edited.

### Tests — `tests/detect-edit-conflicts.test.js`

Same inline-fixture style as `tests/mergePois.test.js`:

1. Two files touch disjoint POIs → both applied, no conflicts.
2. Two files edit the same field (`notes`) on the same POI to different values → conflict, POI untouched, both values present.
3. Two files edit different fields on the same POI → auto-merged, no conflict.
4. Two files edit the same field to the same value → merged silently, no conflict.
5. A `new` POI in only one file, base absent → applied in the right city.
6. Two `new` edits, same id, differing content, base absent → conflict.
7. One file deletes a POI, another edits it (base present) → conflict.
8. File A has a `new` POI, file B has an unrelated `override` — both applied in one run (the literal "adds a POI + edits a note" pattern).
9. A `new` edit whose `poiId` already exists in base (the stale-forever-record case) → resolves via the override path, not a duplicate; no-op if `poiEquals` base. *(Regression test for D7's bug.)*
10. `new` in file A + `override` in file B, same `poiId`, base present → resolves via the value-diff path, not a crash or a duplicate.
11. Optional-field normalization: base has no `photos` and real `walkingTourNotes`; an edit has `photos: []` and omits `walkingTourNotes` → neither registers as a change. *(Regression test for D8's bug.)*
12. Partial application: one conflicted POI + one clean POI in the same run → the clean one is written, the conflicted one stays untouched, and is still reported.

### Verification

1. `npm test` — new suite passes alongside the existing four test files.
2. `npm run typecheck` and `npm run lint` — pass on the new file.
3. Manual CLI pass in the scratchpad: copy `pois.json`, hand-write two small fixture changesets (one disjoint-POI pair including a `new` addition, one same-POI `notes` conflict), run the script against the scratch copy with `--base`, confirm exit code `1`, the conflict reports both values, and the disjoint POIs applied correctly.
4. `npm run validate:pois` and `npm run build` against the real repo — unaffected, nothing above touches the real `pois.json`.
5. No `git add`/`commit`/`push`. Report the full diff and verification results, then stop for review.

### Cold-start prompt (worker session)

```
Deploy Phase 2 of the "Agent Workflow Tooling" plan for waypoints-europe.

Read docs/planning/2026-08-13-agent-workflow-tooling-plan.md § "Phase 2 — Conflict-aware
merge for poi-merge-edits" in full. Implement exactly what it specifies:
- scripts/detect-edit-conflicts.ts (algorithm and CLI shape are fully specified — implement
  the per-poiId group logic and field diff as described, don't redesign it)
- tests/detect-edit-conflicts.test.js (the 12 listed cases)
- the four "Files to edit" edits (package.json, .claude/settings.local.json,
  .claude/skills/poi-merge-edits/SKILL.md, docs/travel-workflow.md)

Every design decision is already made (D5-D8 above, or the "Design" section for detail) —
no open questions, this is implementation of a fully-specified algorithm, not a redesign.

After implementing, run everything under "Verification" and report the results.

Do not run `git add`, `git commit`, or `git push` at any point — report the full diff
(`git status`, `git diff`) and the verification results, then stop and wait for the user
to review and explicitly approve before anything is committed.

If any current file content doesn't match what the plan quotes as "current" (i.e. the plan
is stale against the repo — e.g. if Phase 1 hasn't been committed yet and poi-merge-edits/
SKILL.md differs from what's described), stop and flag the mismatch rather than guessing
how to reconcile it.
```

**Suggested model: Sonnet-class (mid-tier).** The algorithm, types, CLI shape, file list, and test list are all fully specified above — including the two real bugs a fixed Opus stress-test pass already found and resolved. What's left is implementing a well-specified diff algorithm and wiring it up, not designing one.

## Execution map

**Phase 1**: single worker session, no gate cycle (doc/config-only, no app code touched, `git diff --stat -- src/data/pois.json` empty by construction) — the worker stops short of committing, so the user's own review before approving the commit *is* the check. Deployed to the working tree 2026-08-13; commit still pending user approval as of this writing.

**Phase 2**: single worker session, no gate cycle planned — same "stop before commit, user reviews the diff" check as Phase 1, even though this phase does touch app code (`scripts/`, `tests/`) for the first time in this plan. `npm test`/`typecheck`/`lint`/`validate:pois` passing is the objective bar; nothing here is subjective enough to warrant a separate gate review beyond the user's own diff read.

## Session Log

### 2026-08-13 — Design + 3-pass review, not yet deployed

Discussed how to make the three `docs/travel-workflow.md` tracks triggerable from a fresh session without relying on command-name recall. Landed on Claude Code Skills over commands after checking the live docs (commands can't auto-invoke; skills can, via `description` matching, while staying independently callable). Evaluated and declined porting AI Studio's `.agents/skills/` cross-harness registration system into this repo (D1) — disproportionate infra for 3 skills / 1 harness, and doesn't grant portability by itself.

Three Opus review passes, each catching something the prior one(s) missed:
1. `docs/travel-workflow.md` was completely orphaned (zero inbound references); two `CLAUDE.md` lines actively misroute the task; `validate:pois` wasn't allowlisted while the risky fetch step was.
2. `.claude/` was gitignored (any skill built there would've been invisible outside one machine); `git commit`/`git push` were already auto-approved with zero prompts — the real safety gap, not the `allowed-tools` scoping everyone assumed (which turns out to be turn-scoped, additive-only, and harmless).
3. Final verification pass against the concrete written plan: caught a direct contradiction (skill said "don't commit," Track B's doc text said "commit, push"), a wrong changeset-shape check (`author` isn't required), three points where the doc's actual text hadn't made it into the skill bodies (coordinate-resolution priority, the `googleMapsUrl` format rule, Track A's PR step), and that removing `allow` entries alone isn't durable against a future "don't ask again" click — needed explicit `ask` entries instead.

Output: this plan file (Phase 1, fully specified, zero open decisions) plus the corrected [`docs/travel-workflow.md`](../travel-workflow.md) it points into. Not yet executed — queued for a fresh worker session, see the cold-start prompt above.

### 2026-08-13 — Phase 1 deployed to working tree; Phase 2 designed and Opus-stress-tested

Ran Phase 1's cold-start prompt in this session: all 5 changes applied (`.gitignore`, `.claude/settings.local.json`, the three `SKILL.md` files, the two `CLAUDE.md` fixes, the two `docs/travel-workflow.md` edits). Every "current" quote in the plan matched the repo exactly — no staleness. Verification passed (`validate:pois`: 137 POIs; `lint`: clean; all three skill files untracked-and-stageable; `.claude/settings.local.json` correctly still gitignored). Left uncommitted per the plan's own instruction — commit still pending user review as of this entry.

Mid-session, the user asked a follow-up: for `poi-merge-edits`, what happens when both partners independently export edits and both files touch the same POI? Answer surfaced a real gap — `override` edits are whole-POI snapshots, and the deployed skill has no cross-file conflict awareness; whichever file gets applied second silently wins in full. The user wanted detection, flagging, and synthesis where the two edits don't actually disagree — "stress test this to recommend a solution."

First pass (Plan-agent-drafted, not yet checked against real code): a `src/data/detectConflicts.ts` + `scripts/detect-edit-conflicts.ts` split, `--json`/`--out` CLI flags, a 6-variant `AutoMergeKind` enum, dedicated `photos`-array-union logic, 13 test cases covering every theoretical taxonomy branch. The user rejected this as over-engineered against actual usage — "most of the time my partner might add some new POIs, and edit some notes of existing POIs, there will be no major changes... keep it simple" — and it was cut down to one file, no output-mode flags, `photos` as a plain diffed field, 7 tests.

An Opus subagent stress-test pass against the *simplified* plan (all referenced repo files — types, `mergePois`, `editChangeset`, `usePoiData`, `validate-pois.ts`, both existing test files, the deployed `SKILL.md`, current `docs/travel-workflow.md` Track C — inlined directly into the review prompt rather than letting the subagent re-read the repo, per the user's explicit instruction to conserve context) found two real bugs sitting on the exact "adds POIs, edits notes" path the scope was cut down to serve: (1) `usePoiData.ts` only self-heals `override` records against the bundled base, never `new` ones, so a device that added a POI keeps re-exporting `type: 'new'` for it forever after that POI lands in the repo — a "no base counterpart → must be new" branch would have written a duplicate id into `pois.json` with no explanation; (2) `photos`/`walkingTourNotes` are optional fields, and this codebase's `deepEqual` treats an absent key as unequal to an explicit empty one, so an edit that never touched `walkingTourNotes` could register as "deleted it." Both are fixed in the final design (D7, D8) — branch on base-POI presence before edit type, normalize optional fields before comparing — at the cost of ~5 more lines of algorithm and 3 more test cases (9-12 above), not a scope regression back toward the rejected first draft. The pass also caught a live contradiction: the planned `docs/travel-workflow.md` edit would have sat next to an existing sentence recommending on-device "Import edits" (silent last-write-wins) as an alternative for combining two people's changes — the opposite of what this feature exists to do — resolved by stating one policy instead of two.

Output: Phase 2 above (fully specified, zero open decisions), queued for a fresh worker session via its own cold-start prompt. Phase 1's commit and Phase 2's implementation are both still open — see `/MEMORY.md`.
