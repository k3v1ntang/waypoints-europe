# Visited POI — Plan

**Status (2026-08-14): Implemented and merged to `main`.** All D1-D14 decisions shipped as designed, with three adjustments made during interactive review after implementation (see Session Log below): D8's marker-distinction mechanism changed twice (opacity → radius → color-only, the secondary signal dropped entirely); D10's default flipped from OFF to ON; the ⋯ menu picked up additional layout polish beyond the plan's original file list.

## Goal

Let the user mark POIs already seen on a past trip (currently: Paris, Amsterdam) as visited, and optionally hide them from the map when revisiting a city — without losing the pin permanently, and without breaking any of this app's existing on-device-edit / multi-device-merge machinery (`editStore.ts`, `mergePois.ts`, the `poi-merge-edits` skill, `scripts/detect-edit-conflicts.ts`).

## Context that shaped this design

- **This repo is confirmed personal-only.** If the app is ever offered to other people, that happens via a separate fork referencing this repo's architecture — not by other people using this repo's `pois.json` directly. This unblocks storing personal "visited" state directly in `pois.json`; in a shared-`pois.json` world it would have been the wrong call (pollutes canonical data every other user would inherit).
- **`localStorage`/IndexedDB survive normal use** (restarts, weeks unopened — this app already calls `navigator.storage.persist()` to defeat Safari's 7-day eviction) **but are wiped by uninstalling the PWA**, and never sync between the iPhone and the iPad on their own. Baking `visited` into `pois.json` instead means it ships to both devices on the next deploy, and survives a reinstall — the deciding factor once local-only sync friction was weighed against the (now moot) shared-data objection.
- Web research (Map UI Patterns' "visited marker" convention, Google Maps' Want-to-go/Been-here split, Wanderlog's list-visibility toggle, OsmAnd's "mark as passed") confirms the shape of this design — a personal status layered over map data, not a deletion — matches established practice; no code or library to reuse, just validation of the approach.

## Decisions

**D1. Field lives on the POI object, not a separate top-level id list.**
Considered a top-level `visitedPoiIds` set instead, specifically to dodge whole-object merge conflicts. Checked the actual merge script (`scripts/detect-edit-conflicts.ts`, shipped by the Agent Workflow Tooling plan): it already diffs **field-by-field**, not whole-object, so a visited-only edit on one device and a `notes` edit on another already merge cleanly with no collision. A separate list would touch 5-6 files (`editStore`/`types`/`mergePois`/`exportPois`/`parseChangeset`/`validate-pois`) and add a new dangling-reference class the validator would have to police, for no benefit. Rejected.

**D2. Plain `visited?: boolean`. No `visitedAt` timestamp in v1.**
A timestamp doesn't resolve "visited last trip vs. deliberately skipping this trip" — that's an intent question a date alone doesn't answer. Both fields optional, so adding `visitedAt` later is non-breaking. Defer until the ambiguity is actually hit in practice.

**D3. Toggled through the existing `override` edit-record mechanism**, not a new edit-record type. This is a normal field update — same path already used for correcting a description or notes field on-device.

**D4. Merge-script fix is required, not optional — real bug, found by Opus stress-test against the actual code.**
`scripts/detect-edit-conflicts.ts`'s `DIFF_FIELDS`/`setField` is a closed list of 9 field names; `visited` isn't in it. Unfixed: a two-device merge silently drops the visited flag and reports success with no conflict — and if `visited` is the *only* field two changesets disagree on for a POI, the merge's "identical, nothing to apply" fast path actively **reverts** it on both devices. Add `'visited'` to `DiffField`/`DIFF_FIELDS`/`setField`, with a regression test.

**D5. Never write `visited: false` — omit the key; normalize before comparing.**
`usePoiData.ts` clears a pending-edit badge once a stored override exactly equals the bundled base POI, via `poiEquals`/`deepEqual` — which also compares key counts (see `mergePois.ts`). Writing `visited: false` on every un-visited POI means that equality can never hold against a base POI with no `visited` key at all, so the "pending edit" badge would never self-clear after a merge lands. Fix: omit the key entirely when false (in the editor's save path and the popup's quick-toggle), and add `visited: poi.visited ?? false` normalization to `detect-edit-conflicts.ts`'s existing `normalizePoi` step — same treatment already given to `photos`/`walkingTourNotes`.

**D6. Visited POIs stay reachable through search — hiding is never a one-way trip.**
With hide-visited on, a visited POI drops out of the map's clustered source and can't be tapped there. Verify (don't assume) that the search sheet still lists it — it selects via `findPoiById` against full `poisData`, not the filtered map source, so this should already hold — and add a one-tap un-mark action to the popup regardless of hide state.

**D7. Walking-tour routes are exempt from the hide-visited filter while a tour is open.**
The tour route line is built from `selectedTour.poiSequence` via a code path (`Map.tsx` ~line 297-299) that doesn't consult the same visibility predicate the markers use (~line 38-41). Left alone, hide-visited-on draws the dashed route through stops with no marker. Opening a tour is an explicit statement of intent — exempt its POIs from the filter for the duration.

**D8. Green, visited-first in the color expression, plus a second signal (opacity) — not hue alone.**
User confirmed green is fine despite `--color-success` already meaning "walking-tour stop" in the popup banner (different UI surface, accepted overlap). Put the `isVisited` branch **first** in `Map.tsx`'s `circle-color` `case` expression, ahead of the existing hotel-red branch — once decluttering, "have I done this" is the dominant question. Also reduce `circle-opacity` for visited markers so the signal doesn't rely on hue alone. MapLibre paint expressions can't read the CSS `--color-success` dark-mode override, so the hex is fixed either way — mirror the token value with a comment.

**D9. `isVisited: poi.visited === true`, never a bare `poi.visited`, in `buildGeojson`.**
GeoJSON serialization drops `undefined` properties; MapLibre's `case` throws at evaluation time on a null/undefined condition instead of falling through. Mirror the existing `isHotel: poi.category === 'hotel'` pattern exactly.

**D10. Toggle lives in the existing ⋯ overflow menu, defaults OFF, persisted to `localStorage`, labeled with a live count.**
The ⋯ menu is already the documented home for data-management/settings-type controls (`BottomBar.tsx`). Default OFF: a filter that hides data *and* persists across launches is the "where did my pins go" trap, worst discovered offline in a foreign city — and this flag applies identically on both devices after the next merge/deploy, so a default-ON hide could silently blank out Paris for whoever opens the app next. Label "Hide visited places (N)" so the count stays visible.

**D11. Primary interaction is a one-tap toggle in the POI popup; the edit-sheet checkbox is secondary.**
The edit sheet is a 4-step modal flow (tap marker → Edit → toggle → Save) — too expensive for an action done dozens of times per city. A direct save of `{...poi, visited: !poi.visited}` from the popup is the primary UX; keep a checkbox in `PoiEditorSheet` too, for discoverability. If toggling to visited while hide-visited is on, close the popup — its marker just vanished out from under it.

**D12. Rename `PoiEditorSheet`'s existing delete button: "Hide this place" → "Remove this place."**
That label already means delete (a `delete`-type edit record) and is about to collide in meaning with the new, far less destructive "hide visited places" toggle. Pure rename, no behavior change.

**D13. `visited` is optional; validated only when present.**
Add a `typeof poi.visited !== 'boolean'` check (when the key exists) to `getPoiErrors` in `poiValidation.ts` — shared by the build-time validator and the in-app editor, so one change covers both. No migration: absent means false, so all 166 existing POIs stay valid untouched. Add a visited count to `validate-pois.ts`'s success summary as a cheap post-merge sanity check.

**D14. Rejected: MapLibre `feature-state` instead of a data property.**
Checked against MapLibre's docs directly: `feature-state` can't be read by `filter` expressions (this feature needs filtering, not just paint), and doesn't work with clustered sources at all (the `pois` source has `cluster: true`). It's also designed to be ephemeral — wiped on reload — while `visited` must persist, export, and merge. Feature properties + `case` + source-level filtering is the documented-correct split; confirmed no better-established MapLibre pattern exists at this app's size.

## Design — files and scope

- **`src/data/types.ts`** — add `visited?: boolean;` to `Poi`.
- **`src/data/poiValidation.ts`** — optional boolean check (D13).
- **`scripts/validate-pois.ts`** — visited count in the summary line (D13).
- **`scripts/detect-edit-conflicts.ts`** — add `'visited'` to `DiffField`/`DIFF_FIELDS`/`setField` (D4); extend `normalizePoi` for `visited` (D5).
- **`tests/detect-edit-conflicts.test.js`** — regression test: two changesets, one toggles `visited` on a POI the other edits a different field on → both land, no conflict (D4). Regression test: absent vs. `visited: false` compare equal under normalization (D5).
- **`src/components/PoiEditorSheet.tsx`** — "Visited" checkbox in `Draft`/`draftFromPoi`/save path, omitting the key when false (D5); rename the delete button (D12).
- **`src/components/POIPopup.tsx`** — primary one-tap visited toggle using the existing save path (D11); un-mark action always available (D6).
- **`src/components/Map.tsx`**:
  - `buildGeojson` (~line 56-68) — `isVisited: poi.visited === true` (D9).
  - `circle-color` case expression (~line 545-550) — visited-first green branch + reduced `circle-opacity` (D8).
  - `shouldShowPOI` (~line 38-41) — hide-visited condition, reading persisted toggle state.
  - Route-line construction (~line 297-299) — exempt active tour's `poiSequence` ids from the hide-visited filter (D7).
  - `localStorage` read/write for the toggle, same guarded try/catch pattern as the existing one (~line 107-113).
- **`src/components/BottomBar.tsx`** (⋯ overflow menu) — "Hide visited places (N)" toggle row (D10).
- **`src/App.tsx`** — thread toggle state/setter between `BottomBar` and `Map` if it doesn't already live at the right level (confirm during implementation).
- **Docs** — `CLAUDE.md` POI-object field list, `docs/implementation/city-data-contract.md`, `docs/architecture/technical-architecture.md`: add `visited` to the documented POI shape.

## Out of scope (evaluated and declined)

Separate top-level visited-id list (D1) · `visitedAt`/per-trip history (D2) · MapLibre `feature-state` (D14) · `clusterProperties` "N of M seen" cluster badges (real MapLibre feature, but must be declared at source creation, ~`Map.tsx` line 484-490 — revisit only if wanted later) · bulk "mark whole city visited" · backend/account-based real-time cross-device sync (sync model stays: local edit → export → `poi-merge-edits` → commit → deploy, the same cadence already used for every other in-trip correction).

## Verification

- `npm test` — new + existing suites pass.
- `npm run typecheck`, `npm run lint`, `npm run validate:pois` all clean.
- Manual: mark a POI visited via the popup → marker turns green/dims, ⋯ menu count increments. Toggle "hide visited" on → marker disappears from the map, POI still findable via search and still un-markable from there. Open a walking tour containing a visited/hidden POI → route line still passes through it.
- Export edits → confirm the JSON either omits `visited` (false) or has `visited: true` — never `visited: false`.
- Two-device merge regression: hand-craft two changesets both touching one POI — one setting `visited: true`, the other editing `notes` — run `npm run detect-edit-conflicts`, confirm both changes land with no conflict raised.
- `git diff --stat -- src/data/pois.json` empty (no data migration needed for the 166 existing POIs).

## Cold-start prompt (worker session)

```
Implement the "Visited POI" plan for waypoints-europe.

Read docs/planning/2026-08-14-visited-poi-plan.md in full, including the Decisions and
Design sections. Every design decision is already made (D1-D14) — this is implementation
of a fully-specified feature, not a redesign. D4/D5 are real-bug fixes found by an Opus
stress-test pass against the actual merge script, not optional polish — they must land
alongside the rest of the feature, not as a follow-up.

Implement in this order:
1. src/data/types.ts, src/data/poiValidation.ts, scripts/validate-pois.ts (data model + validation)
2. scripts/detect-edit-conflicts.ts + tests/detect-edit-conflicts.test.js (merge-script
   fix, D4/D5 — do this before UI work so the regression tests exist first)
3. src/components/Map.tsx (rendering + filtering + route exemption, D7-D9)
4. src/components/POIPopup.tsx + src/components/PoiEditorSheet.tsx (interaction, D5/D11/D12)
5. src/components/BottomBar.tsx (overflow menu) + any App.tsx state plumbing (D10)
6. Docs updates (CLAUDE.md, city-data-contract.md, technical-architecture.md)

Read each file's actual current content before editing — the plan's file:line references
are a guide, not a guarantee; if something doesn't match, adapt to the real code rather
than guessing.

After implementing, run everything under "Verification" and report the results.

Do not run `git add`, `git commit`, or `git push` at any point — report the full diff
(`git status`, `git diff`) and the verification results, then stop and wait for the user
to review and explicitly approve before anything is committed.

If any current file content doesn't match what the plan describes (i.e. the plan is stale
against the repo), stop and flag the mismatch rather than guessing how to reconcile it.
```

**Suggested model: Sonnet-class (mid-tier).** The algorithm for D4/D5 and the visual/filter design for D7-D9 are fully specified; what's left is wiring across components (popup save path, overflow-menu state plumbing) that's well-described but not copy-paste mechanical, so mid-tier rather than the lowest tier — no open design questions remain, so not a case for a top-tier/reasoning model either.

## Execution map

Single-phase, single worker session, no gate cycle — the worker stops short of committing; the user's own review of the diff before approving the commit is the check. Same pattern as the Agent Workflow Tooling plan's two phases.

## Session Log

### 2026-08-14 — Design + Opus stress-test, not yet implemented

User wanted to stop re-seeing POIs already visited on a past trip (Paris, Amsterdam) without losing them permanently. Web research surfaced the established shape of this problem across travel apps: a "visited marker" convention (dim/recolor rather than delete), Google Maps' Want-to-go/Been-here list split, Wanderlog's list-visibility toggle, OsmAnd's "mark as passed" — all personal state layered over map data, never a data mutation.

First pass evaluated storage options against this app's actual architecture (`editStore.ts`/`mergePois.ts`/`poi-merge-edits`) under the assumption that `pois.json` might eventually be shared with other users of the app directly — under that assumption, a local-only store (`localStorage`, decoupled from `pois.json`) was the right call, and reusing `editStore.ts`'s `delete` tombstone was flagged as wrong (it flows into `poi-merge-edits` and would permanently delete the POI from shared data for everyone).

User asked whether local-only storage survives a phone restart or PWA deletion (confirmed: survives restarts and the app's existing `navigator.storage.persist()` 7-day-eviction fix; wiped only by uninstalling the PWA or clearing Safari site data) and then clarified the actual constraint: any future sharing of this app happens through a **separate fork**, not this repo — so this repo's `pois.json` is personal-only after all. That reopened baking `visited` directly into `pois.json`, using the existing `override` edit mechanism (not the `delete` tombstone), as the better fit — it also solves the cross-device sync question `localStorage` couldn't, by riding the same commit/deploy pipeline the app already uses for every other in-trip data correction.

User confirmed green as the marker color and asked for the design to be written up as a spec and adversarially stress-tested by an Opus subagent before implementation, specifically for gaps and for whether a better-established framework/pattern existed. The review (full report relayed to the user in-session) found the overall shape correct — no better-established pattern exists; MapLibre's `feature-state` was checked and specifically ruled out (can't be read by filters, doesn't work with clustered sources) — but caught two real bugs on the exact "two devices, same POI" merge path: the deployed `detect-edit-conflicts.ts` script (from the Agent Workflow Tooling plan) would silently drop or actively revert a `visited` flag during a two-device merge, because `visited` wasn't in its closed field-diff list; and writing `visited: false` explicitly (rather than omitting the key) would permanently break the app's stale-edit self-heal, leaving phantom "pending edit" badges forever. It also raised UX-correctness points not in the first draft: the walking-tour route line is built from a code path that doesn't consult the map's visibility filter (would draw through hidden stops), and a hidden POI needed a guaranteed way back in (search + popup un-mark) so hiding is never a one-way trip. All findings folded into D1-D14 above.

Output: this plan file, fully specified, zero open decisions. Not yet executed — queued for a fresh worker session via the cold-start prompt above.

### 2026-08-14 — Implemented, interactively reviewed, and merged

Implemented via the cold-start prompt in a worker session sharing this checkout. Mid-session the checkout's branch moved out from under the worker - another concurrent session fast-forward-merged this plan file's own commit from `docs/visited-poi-plan` into `main` while the worker held uncommitted changes on top. Harmless (working-tree edits aren't branch-bound) but worth flagging for future shared-checkout sessions.

All six implementation steps landed in the specified order: `types.ts`/`poiValidation.ts`/`validate-pois.ts` (data model), `detect-edit-conflicts.ts` + regression tests (D4/D5 merge-script fixes - tests written before any UI work, per the cold-start prompt's explicit ordering), `Map.tsx` (rendering/filtering/route exemption), `POIPopup.tsx`/`PoiEditorSheet.tsx` (interaction), `BottomBar.tsx` (overflow menu) - confirmed no `App.tsx` plumbing was needed, since `BottomBar` and `Map`'s state already live in the same component - and the three doc files (`CLAUDE.md`, `technical-architecture.md`, `city-data-contract.md`). Full verification passed: `npm test` (67/67, 16 in the merge-conflict suite, up from 12), `npm run typecheck`/`lint`/`validate:pois`/`build` all clean, plus a real (non-unit-test) two-device merge run against a scratch copy of the actual `pois.json` via the CLI, confirming D4's fix end-to-end outside the test harness.

User interactive review after implementation caught issues the plan didn't anticipate and drove three changes:

1. **⋯ menu layout** (not in the plan's original file list, found by screenshot review). The new "Hide visited places" toggle sat as an ungrouped row between "Pending edits" and the export/import rows with no visual separation, and its left icon (reused `CheckIcon`) duplicated the toggle switch's own on/off signal. Fixed with three-section grouping (Pending edits / Map / Data - iOS-Settings-style labels + rules between groups) and a dedicated `EyeIcon`. Next found: the toggle switch itself wasn't right-aligned like the export row's badge/chevrons (missing the `margin-left: auto` `.menuBadge` already had) - fixed. Next found: the popover visibly resized on every toggle - twice over. First because `.menu` had only `min-width` (not a fixed `width`), so it grew or shrank to fit whichever row's text was currently longest; fixed with a fixed width, which then required fixing the middle text-wrapper span's default `min-width: auto` (flex items don't shrink below their content's natural width without this, so a fixed container alone doesn't make text wrap - it just overflows) via a new `.menuItemText` class. Second, even after both fixes, the "on" subtitle ("On - visited pins hidden from the map") still wrapped to a second line while "off" stayed on one line, growing the popover *taller* on toggle - fixed by shortening the "on" copy to "On - visited pins hidden" (kept no longer than the "off" string).

2. **D8's marker-distinction mechanism, revised twice.** The plan called for `circle-opacity` as the "second signal beyond hue" for visited markers. On-device this looked broken rather than intentional: MapLibre's `circle-opacity` is genuine alpha transparency, so the basemap's own place-label text showed through the dimmed green marker, unlike the fully-opaque blue/red markers. First fix: swapped opacity for a smaller `circle-radius` (7 vs 9) - de-emphasized without the transparency artifact. User then asked for the visited marker to be the *same size* as blue/red, dropping the secondary signal entirely. **Current state**: visited markers are color-only (green, first in the `circle-color` `case` expression, same radius and full opacity as every other marker) - D8's colorblind-accessibility rationale (a signal beyond hue alone) is no longer implemented on the marker itself. The popup's checkmark toggle and the ⋯ menu's live count remain as non-color confirmation elsewhere in the UI, but nothing on the marker.

3. **D10's default flipped from OFF to ON**, after an in-session discussion, not a bug report. D10's original reasoning - `hideVisited` persists per-device and the `visited` field it filters on is shared data, so a default-ON hide could silently blank out a city for a fresh device with no on-map indication why - still holds functionally; nothing about it was wrong. User's counter-reasoning for actual trip use: default-OFF means every fresh device or reinstall starts by showing everything, requiring a manual re-toggle before the filter is useful again; for a phone+iPad+occasional-reinstall workflow during an active trip, that manual step is worse than the "silent" risk D10 was guarding against. **Implemented**: `hideVisited` now defaults to `true` when no stored preference exists (an explicit prior `'false'` on a given device still wins - this only affects genuinely fresh devices/installs, not a device that's already been used). No on-map "N hidden" indicator was added - offered, user deferred it; the ⋯ menu's live count is considered sufficient for now.

**Real data**: `paris-palace-of-versailles` marked `visited: true` (this session, per user request), alongside the user's own direct edits made in parallel on the same file - `amsterdam-college-hotel` replaced with a different property (`amsterdam-renaissance-hotel`), `amsterdam-w-amsterdam` and the new `paris-citadines-les-halles` (added this session by the user) both marked visited. Final: 167 POIs (3 visited), `npm run validate:pois` clean.

Committed to a short-lived branch and merged to `main` in the same commit as this Session Log update - the D4/D5 merge-script bugfix and the new feature shipped together, as the plan required.
