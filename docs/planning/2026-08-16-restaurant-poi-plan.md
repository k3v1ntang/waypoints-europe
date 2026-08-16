# Restaurant POI — Plan

**Status (2026-08-16): Design drafted, Opus-stress-tested, all findings folded in. Not yet implemented.** Ready for a worker session. Code portion should land before the ~Aug 22 feature freeze noted in `MEMORY.md` (D13) — restaurant *content* additions afterward depend on this capability already being live.

## Goal

Let Kevin mark a short, hand-picked list of "we are prioritizing this restaurant for the trip" places on the map, visually distinct from regular POIs, with **no new filter UI and no new in-app interaction** — a pure content + rendering feature, added deterministically only when Kevin explicitly initiates it.

## Context that shaped this design

- **This is lighter than Visited POI, but not weightless.** `category` is an existing, required `Poi` field already fully wired through the merge machinery — already in `detect-edit-conflicts.ts`'s `DIFF_FIELDS`/`setField` closed list, so *adding a new POI* with `category: "restaurant"` needs zero merge-script changes. Where real risk reappears is a different operation this feature introduces for the first time: **recategorizing an existing POI** (`food`/`landmark` → `restaurant`) when a priority restaurant turns out to already be in `pois.json`. That's not covered by any prior plan and needed its own decision (D11).
- **The existing `food` category is semantically narrow and must stay that way.** Per `docs/travel-workflow.md`'s Track B "durability test," `food` is reserved for destination-grade places that happen to serve food (Sea Palace, Markthal, market halls) — a place that "stays worth knowing about after the trip," not an ordinary restaurant pick. Kevin's ask ("key restaurants I want to prioritize") is explicitly the thing the durability test currently *excludes* ("a specific dinner reservation pick... stays in Google Maps"). This is a real, deliberate policy fork, not a styling variant of `food` — see D1.
- **No marker color today is actually category-driven.** `Map.tsx`'s `circle-color` paint expression only special-cases `isHotel` (red) and `isVisited` (green, wins first, added by the Visited POI plan); `food`/`culture`/`landmark`/`practical` are all the same default blue. A restaurant color is a new axis, not an extension of an existing one.
- **Research** (Wanderlog, PinMapApp, "Personal POI") confirms color-coded category pins for exactly this shape of distinction (restaurants/hotels/landmarks) is the established, unremarkable pattern in travel map apps. Sources: [Wanderlog](https://wanderlog.com/travel-maps), [PinMapApp](https://apps.apple.com/pl/app/pinmapapp/id6758046753).
- **Determinism went through three real iterations, the last driven by an Opus stress-test, not just discussion.** First considered: inferring restaurant intent from message phrasing (rejected — not actually deterministic; `food`-category places already legitimately say "restaurant" in their own notes). Second: a `--restaurant` flag inside the single `poi-add` skill, checked as a literal substring of `$ARGUMENTS` (Kevin's preference, to avoid duplicating `poi-add`'s shared steps across two files). The Opus review found this mechanism itself was not actually deterministic in practice: `poi-add` auto-triggers from a *pasted link*, not a slash command (`docs/travel-workflow.md`: "Run whenever Kevin drops one or more links"), so the flag could be silently dropped by whatever triggered the skill before `$ARGUMENTS` was ever populated, plus real fragility from iOS auto-punctuation (`--` → em dash) and no rule for a multi-link batch. Landed on a **delegating stub command** (D6) — a separate, manual-only skill that doesn't duplicate `poi-add`'s steps, it references them, which resolves Kevin's original drift concern while also being structurally immune to the auto-trigger problem.
- **The Opus stress-test also caught a real color-accessibility gap (D2) and a real recategorization/merge interaction (D11)** that neither the initial design nor the first round of discussion surfaced. Full findings are summarized inline at each affected decision below; this plan reflects the post-review state, not the original draft.

## Decisions

**D1. New `Category` enum value `restaurant`, not a reuse of `food` and not a boolean flag.** *(Confirmed correct by Opus review — no better-established pattern found.)*
Considered reusing `food` (rejected — the 8 existing `food` POIs, including a plain square, would inherit the new color despite not being restaurants, collapsing a distinction `travel-workflow.md` deliberately draws). Considered a `priority?: boolean` flag mirroring `visited` (rejected — replicates the full `visited`-plan machinery for a feature that's never toggled in-app, only set at add-time). A new category value needs zero merge-script changes for the *add* case, reuses the existing editor `<select>` as-is, and is enforced at compile time everywhere it matters — `CATEGORY_LABELS`/`CATEGORY_ICONS` are `Record<Category, string>`, so omitting the new key is a compile error, not a silent gap.

**D2. Marker color: `#8b5cf6` (revised from an initial `#7c3aed` after an accessibility check).**
The Opus review ran actual color-vision-deficiency simulation (Viénot 1999 matrices, CIE76 ΔE) on all marker colors in use: `#7c3aed` purple vs. the default blue `#2563eb` scored ΔE 2.4 under deuteranopia (red-green color blindness) — below the just-noticeable-difference threshold, i.e. **functionally the same color** under that condition — while the existing green-vs-blue pair (visited vs. default) scores ΔE 99.5, nowhere near that problem. The plan's original color choice had implicitly assumed "hue-only worked for visited, so it'll work here," which doesn't actually transfer. `#8b5cf6` scores far better under deuteranopia (ΔE 11.1 vs. blue) while staying clearly distinct from blue/red/green in normal vision, and keeps strong contrast against the 3px white marker stroke. Orange/amber remains rejected regardless (collides with the cluster layer's medium-cluster amber `#f59e0b`).

**D3. Keep the existing boolean-flag `case`-chain rendering pattern; do not refactor to a `match`-on-`category` expression.** *(Confirmed correct by Opus review at this scale.)*
Add `isRestaurant: poi.category === 'restaurant'` to `buildGeojson`'s properties (mirrors `isHotel`/`isVisited` exactly). Extend the `circle-color` case expression with `isRestaurant` as a third branch, after `isVisited` (which must keep winning — a visited restaurant should read as visited, same as a visited hotel already does), position relative to `isHotel` doesn't matter (no POI is both):

```js
'circle-color': [
  'case',
  ['get', 'isVisited'], VISITED_MARKER_COLOR,
  ['get', 'isHotel'], '#dc2626',
  ['get', 'isRestaurant'], RESTAURANT_MARKER_COLOR, // '#8b5cf6'
  '#2563eb'
]
```

`match` is the more idiomatic MapLibre pattern for a *generalized* categorical color map, but at two colored categories plus a default it doesn't simplify anything today, and mixing `case` (for `isVisited`) with `match` (for the rest) in one expression would be less consistent, not more. **Revisit if a third category ever wants its own color.** Noted for whoever revisits it: `buildGeojson` (currently `id`/`name`/`cityName`/`isHotel`/`isVisited`) does not expose `category` as a feature property at all today — a future `match`-on-`category` refactor needs that property added, not just a paint-expression rewrite.

**D4. No new interaction machinery for the *add* case; the *recategorize* case gets its own decision (D11).**
`category` is already a plain editable field (`PoiEditorSheet`'s `<select>`, populated from `VALID_CATEGORIES`) — a brand-new restaurant POI needs no popup toggle, no `localStorage`, no `detect-edit-conflicts.ts` change, no new regression test (existing merge tests already exercise `category` generically). The Opus review confirmed this claim holds for *additions*. It does **not** extend to recategorizing an existing POI, which has a real stale-override interaction with the merge machinery — see D11, do not skip it.

**D5. `PoiEditorSheet`'s mid-trip default category stays `food`, unchanged.** *(Confirmed accurate — `category: 'food'` at `PoiEditorSheet.tsx:65`.)*
That default is for *manual, in-app, unplanned* additions — a different situation from a deliberately pre-planned priority restaurant, which always goes through D6's command, never the blank in-app add-new flow.

**D6. A separate, manual-only `poi-add-restaurant` command — a delegating stub, not a duplicate skill, and not a flag inside `poi-add`.**
Reversed from the plan's first draft after the Opus review. The original design (a `--restaurant` flag checked as a literal substring of `poi-add`'s `$ARGUMENTS`) was chosen specifically to avoid duplicating `poi-add`'s shared steps across two files — a real concern, and still correctly rejected in its full-duplicate form. But the flag mechanism itself turned out not to be reliably deterministic: `poi-add` is triggered by *pasting a link* (per `travel-workflow.md`'s documented habit), not by typing a slash command, so whatever decides to auto-invoke the skill could drop the flag before `$ARGUMENTS` is ever populated — silently routing a priority restaurant through the durability test instead. Additional fragility found: iOS auto-punctuation can turn `--restaurant` into an em-dash variant that fails a strict literal match, and there was no rule for what the flag means across a multi-link batch (Track B explicitly supports pasting several links in one message).

The fix that resolves all three at once, found by the review: a **delegating stub** — `.claude/skills/poi-add-restaurant/SKILL.md`, `disable-model-invocation: true` (same precedent already used by `poi-new-trip` for a deliberately manual-only flow). Its body does not repeat `poi-add`'s dedup-check/coordinate-resolution/write/validate/report steps — it references them by name and only states the delta:

- No durability test — invoking this command *is* the entire inclusion criterion.
- `category` unconditionally `'restaurant'`.
- `visibility` unconditionally `'always'` (D12).
- Dedup check gets the recategorize behavior from D11.
- One priority restaurant per invocation — if several need adding, run the command once per link (natural given how deliberate/manual this flow already is; removes the multi-link ambiguity the flag version had).

Because the stub is only reachable by explicitly typing `/poi-add-restaurant`, there is no flag to lose, no punctuation to mismatch, and no batch-scoping question — invocation *is* the signal. `poi-add/SKILL.md` itself needs **zero edits** under this design; all restaurant-mode behavior lives in the stub.

**D7. `travel-workflow.md` gets two inclusion paths documented explicitly, not one loosened durability test.**
The durability test answers "will this matter after the trip." The priority-restaurant path answers "did we deliberately decide, in advance, to prioritize this." Write them as two clearly separate paths, both ending in a `category` assignment. The Opus review found the plan's original edit list for this file was incomplete — it named only the overview line, Track B step 1, and the category mapping table, but missed two more places the five-value enum is spelled out inline: the `Poi.category` enum line near the top of the Category Mapping section, and the `food` row's own "not a plain dinner reservation" wording, which should now cross-reference the new `restaurant` row rather than stand alone as if the schema still only has one food-adjacent category.

**D8. No content added in this pass.** This plan is capability-only. Kevin adds actual restaurant POIs afterward, incrementally, via `/poi-add-restaurant <link>`.

**D9. Search icon and editor label needed for discoverability.** *(Confirmed accurate — both `CATEGORY_LABELS` and `CATEGORY_ICONS` are typed as `Record<Category, ...>`, so a missing 6th entry is a compile error, not a silent gap; both render sites already have `?? fallback` guards.)*
Proposed icon: 🍷 (distinct from `food`'s 🍽️ in a scanned list). Freely changeable during implementation.

**D10. Rejected after review: a `--color-restaurant` token in `tokens.css`.**
The plan's first draft floated this as "recommended, low-stakes." The Opus review found it should be dropped outright, not just left optional: every existing brand token (`--color-danger`, `--color-success`) has real `var()` consumers elsewhere in the app; a restaurant-marker token would have **zero**, because the only reader (`Map.tsx`'s MapLibre paint expression) cannot read CSS custom properties at all — the exact reason `VISITED_MARKER_COLOR` is already a hand-synced hardcoded hex with a comment, not a token reference. Worse, `--color-success` carries a dark-mode override that `VISITED_MARKER_COLOR` deliberately does *not* follow, so a new token would ship with a "don't actually use me the way other tokens are used" caveat baked in — a second, divergent source of truth for one hex, with nothing to catch drift. **Keep the hex hardcoded in `Map.tsx` only.** Add a real token later if a CSS surface actually needs the color (e.g. tinting a category chip) — not preemptively.

**D11. New. Recategorizing an existing POI (`food`/`landmark` → `restaurant`) needs its own mechanics and its own merge-safety caveat — this is a materially different operation from adding a new POI, and D4's "no merge-script changes needed" claim does not cover it.**
Found by the Opus review, same failure shape as Visited POI's original D4 bug, on a new trigger: `detect-edit-conflicts.ts`'s conflict logic is field-by-field and entirely correct on its own terms — but `category` is a required field, so an on-device `override` record *always* carries a full category value, including a stale one written before the repo-side recategorization happened. If a device holds any unrelated pending edit on that same POI (e.g. a `notes` fix from days earlier) when the repo recategorizes it, the next merge sees the device's stale `category: 'food'` as "the one real changer" against the repo's new `'restaurant'`, and — because it's the only field in disagreement — the merge's already-established "single changer, no real conflict" fast path silently **applies the stale value**, reverting the recategorization with no conflict raised and a reported success. This is a process risk, not a script bug — `detect-edit-conflicts.ts` needs no code change.

Mitigations, all process/documentation, not code:
- Before recategorizing an existing POI in the repo, check whether either device might be holding a pending edit on it; if in doubt, export and merge any pending changesets for that POI *first*, then recategorize.
- The stub's report (mirroring `poi-add`'s existing report-and-wait step) must call out a recategorization as its own explicit line — `recategorized <id>: food → restaurant` — never silently folded into a generic "added" summary, so it's consciously reviewed before commit.
- `travel-workflow.md`'s Track C gains one line naming this general risk class: a repo-side field change to an *existing* POI can be silently reverted by a stale on-device override touching the same POI — export+merge pending edits first.

**Worked example for the recategorize case** (resolves the plan's original under-specification, also found by review): keep `id`, `coordinates`, `googleMapsUrl`, `description`, `walkingTourNotes`, `photos`, and `visited` all untouched; set `category: "restaurant"`; **append** (never overwrite) any new note to the POI's existing `notes` field. The id must never change — `generatePoiId` slugs from name+city, not category, so recategorizing never touches it.

**D12. New. `visibility` must be explicitly `"always"` for every restaurant-mode addition, stated in the stub, not left implicit.**
Found by review: neither the original plan nor `poi-add`'s existing steps mention `visibility` at all in the restaurant path, yet it's a required, validated field, and `shouldShowPOI` hides any POI whose `visibility` is `walkingTour` unless a tour is actively open. A priority restaurant accidentally filed as `walkingTour`-visible would be invisible in normal map use — silently defeating the entire feature. The stub sets this unconditionally, not by inference.

**D13. New. Land the code portion before the ~Aug 22 feature freeze; content additions can follow after.**
`MEMORY.md`'s "Next action" records a feature freeze beginning around Aug 22, after which `main` takes data/content commits only (no schema/skill/code changes). This plan's schema/rendering/skill/docs work is exactly the kind of change that must land *before* that date — D8's "no content in this pass" already means real restaurant POIs get added afterward, during the freeze window, which is fine (that's a content commit), but only if the enum-widening capability is already live; otherwise `npm run validate:pois` correctly rejects any `category: "restaurant"` POI as invalid, blocking the very first content addition.

## Design — files and scope

- **`src/data/types.ts`** — `Category` union: add `'restaurant'`.
- **`src/data/poiValidation.ts`** — `VALID_CATEGORIES`: add `'restaurant'`.
- **`src/components/Map.tsx`**:
  - New `RESTAURANT_MARKER_COLOR = '#8b5cf6'` constant, comment mirroring `VISITED_MARKER_COLOR`'s existing token-sync note (D2, D10).
  - `buildGeojson` — add `isRestaurant: poi.category === 'restaurant'` (D3).
  - `circle-color` case expression (~line 632) — add the `isRestaurant` branch (D3).
- **`src/components/PoiEditorSheet.tsx`** — `CATEGORY_LABELS`: add `restaurant: 'Restaurant'` (D9). Confirm default-category logic (`category: 'food'`) is left untouched (D5).
- **`src/components/SearchSheet.tsx`** — `CATEGORY_ICONS`: add `restaurant: '🍷'` (D9, confirm emoji during implementation).
- **`.claude/skills/poi-add-restaurant/SKILL.md`** — new file, delegating stub (D6, D11, D12). `poi-add/SKILL.md` itself is **not edited**.
- **`docs/travel-workflow.md`** (D7):
  - Overview line — note the deliberate exception, point to the new command.
  - Track B step 1 — split into the durability test (unchanged) and the priority-restaurant path (new), both ending in a `category` assignment; name `/poi-add-restaurant` directly.
  - Category mapping table — new `restaurant` row.
  - The inline `Poi.category` enum spelled out near the mapping table, and the `food` row's own wording — both updated to reflect the 6-value enum (F8, previously missed).
  - Track C — one line naming the stale-override-on-recategorize risk class (D11).
- **`docs/implementation/city-data-contract.md`** — category enum list — add `restaurant`.
- **`docs/architecture/technical-architecture.md`** — category enum in the documented POI shape (~line 121) — add `restaurant`.
- **`CLAUDE.md`** — POI Object field docs' category enum (top of file, ~line 197) — add `restaurant`.
- **`MEMORY.md`** — status update in the same commit as this plan's implementation (repo convention; orchestrator-owned, named here so it isn't missed).

## Out of scope (evaluated and declined)

A full-duplicate `poi-add-restaurant` skill repeating all of `poi-add`'s steps verbatim (correctly rejected — drift risk; **not** what D6 adopts, which delegates rather than repeats) · a `--restaurant` flag inside `poi-add` (D6, reversed after review — not reliably deterministic given `poi-add`'s auto-trigger behavior) · reusing `food` category (D1) · a `priority`/boolean flag mirroring `visited` (D1) · `match`-on-`category` paint-expression refactor (D3, revisit only if a 3rd category wants a color) · a `--color-restaurant` design token (D10, rejected — no real consumer) · any new filter/legend UI (Kevin explicitly doesn't want this; the existing popup category label + search icon already provide non-map discoverability, which is why declining a legend is a defensible trade rather than a real gap) · any popup or editor interaction changes beyond a label/icon (D4) · changing the 8 existing `food` POIs · a secondary non-hue signal on the restaurant marker (color-only, consistent with the Visited POI plan's final on-device-reviewed state, now backed by D2's actual CVD numbers rather than just precedent) · MOSAIC/Track A automatic restaurant sourcing (Kevin confirmed this list is always hand-picked and explicitly initiated, never inferred) · restaurant content itself (D8 — this plan is capability-only).

## Verification

- `npm test`, `npm run typecheck`, `npm run lint`, `npm run validate:pois`, `npm run build` all clean.
- `git diff --stat -- src/data/pois.json` empty — no data migration; widening an enum doesn't touch any existing POI.
- Manual: add one throwaway test restaurant via `/poi-add-restaurant <link>` in a scratch branch → confirm purple (`#8b5cf6`) marker renders at the correct zoom, confirm the durability test did not run, confirm `category: "restaurant"` and `visibility: "always"` in the diff.
- Manual: confirm the ordinary `/poi-add` flow is completely unaffected — paste a restaurant link there with no special handling, confirm the durability test still runs exactly as before (regression check that `poi-add/SKILL.md` truly needed no edits, per D6).
- Manual: recategorize one existing `food` POI to `restaurant` via the stub's dedup-check path → confirm the report explicitly calls out the recategorization as its own line (D11), and confirm `coordinates`/`googleMapsUrl`/`description`/`walkingTourNotes`/`photos`/`visited` are byte-identical before/after, with only `category` changed and the note appended not overwritten.
- Manual: open `PoiEditorSheet` on any POI → confirm "Restaurant" appears in the category dropdown. Open `SearchSheet`, search for a `restaurant`-category POI → confirm the new icon renders.
- Manual: mark a `restaurant`-category POI as `visited` (existing popup toggle) → confirm it renders green (visited wins), not purple — regression check against D3's precedence.
- Manual, post-deploy: open the app on iPhone and iPad on WiFi before adding any restaurant content, confirming both devices are on the updated bundle — a stale device that receives a `category: "restaurant"` POI before its own bundle updates would show a blank category in `PoiEditorSheet` and fail validation on save until it updates (low risk given `autoUpdate` registration, but cheap to confirm once).

## Cold-start prompt (worker session)

```
Implement the "Restaurant POI" plan for waypoints-europe.

Read docs/planning/2026-08-16-restaurant-poi-plan.md in full, including the
Decisions and Design sections. Every design decision is already made
(D1-D13) after interactive discussion and a full Opus stress-test pass that
found and resolved real issues (D6's mechanism was reversed, D2's color was
changed, D11/D12 are new decisions the first draft missed entirely) — this
is implementation of a fully-specified, already-adversarially-reviewed
feature, not a redesign.

Implement in this order:
1. src/data/types.ts, src/data/poiValidation.ts (data model)
2. src/components/Map.tsx (rendering: constant #8b5cf6, buildGeojson, case
   expression)
3. src/components/PoiEditorSheet.tsx, src/components/SearchSheet.tsx (label,
   icon)
4. .claude/skills/poi-add-restaurant/SKILL.md (new file, D6/D11/D12 - a
   delegating stub, NOT a copy of poi-add's steps; poi-add/SKILL.md itself
   is not edited)
5. Docs: docs/travel-workflow.md (D7, including the two previously-missed
   inline enum spots and the Track C stale-override line from D11),
   docs/implementation/city-data-contract.md,
   docs/architecture/technical-architecture.md, CLAUDE.md

Read each file's actual current content before editing - the plan's
file:line references are a guide, not a guarantee.

After implementing, run everything under "Verification" and report results.

Do not run `git add`, `git commit`, or `git push`. Report the full diff
(git status, git diff) and verification results, then stop and wait for
explicit user approval before anything is committed.

If any current file content doesn't match what the plan describes, stop and
flag the mismatch rather than guessing how to reconcile it.
```

**Suggested model: Sonnet-class (mid-tier).** Every decision is fully specified and has already survived an adversarial review; what's left is mechanical wiring across ~9 files, slightly fewer than the plan's first draft (no `tokens.css` change, no `poi-add/SKILL.md` edit) despite the added D11/D12 mechanics, since those live entirely in one new stub file.

## Execution map

Single-phase, single worker session, no gate cycle — same pattern as Visited POI: the worker stops short of committing, Kevin's own diff review is the check.

## Session Log

### 2026-08-16 — Design, interactively discussed, queued for Opus stress-test

Kevin wanted a way to mark a short, deliberately hand-picked list of priority restaurants on the map, color-distinguished from regular POIs, with no new filter complexity. Investigation of the existing codebase found this sits on much lighter infrastructure than Visited POI: `category` is already a fully merge-safe field for additions, and no marker color is currently category-driven at all.

Discussion surfaced a real policy question the initial ask didn't address: the existing `food` category and `docs/travel-workflow.md`'s durability test are deliberately narrow — a hand-picked priority restaurant is explicitly the kind of place that test excludes today. Resolved as two separate inclusion paths (D7), not a loosened test.

Iterated through three shapes for the determinism requirement: inferred phrasing (rejected), a separate full-duplicate `poi-add-restaurant` skill (rejected by Kevin — drift risk), landing on a `--restaurant` flag inside `poi-add`, checked as a literal substring (D6 as first drafted).

Web research (Wanderlog, PinMapApp) confirmed color-coded category pins is the established pattern for this distinction. A `match`-expression refactor was evaluated and deferred (D3) rather than adopted.

Output: initial plan file. Not yet stress-tested or implemented.

### 2026-08-16 — Opus stress-test, findings folded in

Full adversarial review against the live codebase (not just the plan's own claims), matching the rigor that found Visited POI's real D4/D5 bugs. Findings, most severe first, and how each landed:

- **The `--restaurant` flag mechanism (D6, first draft) was not actually deterministic.** `poi-add` auto-triggers from a pasted link, not a slash command, so the flag could be dropped before `$ARGUMENTS` was ever populated by whatever decided to invoke the skill — plus iOS auto-punctuation could mangle a literal `--restaurant` match, and there was no rule for a multi-link batch. **Resolved**: replaced with a delegating-stub command, `poi-add-restaurant`, `disable-model-invocation: true` (same precedent as `poi-new-trip`) — manual-only, references `poi-add`'s shared steps instead of duplicating them (preserving Kevin's original anti-drift requirement in a form that also closes the determinism gap), structurally immune to all three sub-issues since invocation itself is now the entire signal.
- **Recategorizing an existing POI (a case the first draft's dedup-check step introduced almost as an aside) has a real stale-override interaction with `detect-edit-conflicts.ts`** — a device holding any unrelated pending edit on that POI could silently revert the recategorization on next merge, no conflict raised, same failure shape as Visited POI's original D4 bug on a new trigger. **Resolved**: new D11, process-level mitigations (export+merge pending edits before recategorizing; the stub's report calls out a recategorization as its own explicit line) plus a worked field-preservation example, since the first draft never specified which fields survive a recategorize or whether a new note replaces or appends to existing `notes`.
- **`#7c3aed` purple scored a color-vision-deficiency ΔE of 2.4 against the default blue under deuteranopia** — actually simulated (Viénot matrices), not assumed — meaning the two would be functionally indistinguishable for that condition, unlike the existing green-vs-blue (visited) pair the plan's original reasoning leaned on as precedent. **Resolved**: D2 revised to `#8b5cf6`, which scores far better (ΔE 11.1) while keeping the same separation from blue/red/green in normal vision. Kevin's call, given a live check with real numbers rather than an assumption.
- **`visibility` was never mentioned for restaurant-mode additions** — a priority restaurant filed as `walkingTour`-visible (the field's other legal value) would be invisible outside tour mode, silently defeating the feature. **Resolved**: new D12, the stub sets `visibility: "always"` unconditionally.
- Smaller findings folded in without needing a decision, all now reflected above: the plan's `travel-workflow.md` edit list had missed two more places the old 5-value enum was spelled out inline (D7); the optional `tokens.css` token (first draft's D10) was found to have zero real consumers and was dropped outright rather than left "recommended" (D10); a note that a future `match`-on-`category` refactor also needs `category` added to `buildGeojson`, which doesn't expose it today (D3); a stale-device verification step for the short `autoUpdate` window (added to Verification); the ~Aug 22 feature-freeze ordering constraint, since content additions depend on this capability already being live (new D13).

The review also confirmed several claims as accurate against the real code with no changes needed: `category` genuinely is already in `detect-edit-conflicts.ts`'s diff machinery for the add case (D4); `CATEGORY_LABELS`/`CATEGORY_ICONS` being `Record<Category, ...>`-typed means a missing entry is a compile error, not silent (D9); no exhaustive switch, hardcoded category-length assumption, or other closed-enum dependency exists anywhere else in `src/` or `scripts/`; `exportPois.js`, `poi-merge-edits`, and `poi-new-trip` are all category-agnostic and need no changes.

Output: this plan, revised. Ready for a worker session.

### 2026-08-16 — Implemented, awaiting review

Implemented via the cold-start prompt in a worker session. Every file's actual current content was read before editing and matched what the plan described — no mismatches surfaced, nothing to reconcile.

All five implementation steps landed in the specified order:

1. **Data model** — `src/data/types.ts`'s `Category` union and `src/data/poiValidation.ts`'s `VALID_CATEGORIES` both widened with `'restaurant'`.
2. **Rendering** (`src/components/Map.tsx`) — `RESTAURANT_MARKER_COLOR = '#8b5cf6'` added next to `VISITED_MARKER_COLOR` with a matching token-sync comment (D2/D10); `isRestaurant: poi.category === 'restaurant'` added to `buildGeojson`, mirroring `isHotel`; a third `circle-color` `case` branch added after `isVisited`/before the blue default (D3).
3. **Editor/search** — `PoiEditorSheet.tsx`'s `CATEGORY_LABELS.restaurant = 'Restaurant'`, `SearchSheet.tsx`'s `CATEGORY_ICONS.restaurant = '🍷'` (D9). Confirmed `PoiEditorSheet`'s mid-trip default category (`'food'`) needed no change (D5).
4. **New skill** — `.claude/skills/poi-add-restaurant/SKILL.md`, a delegating stub (`disable-model-invocation: true`, same precedent as `poi-new-trip`) that references `poi-add`'s dedup-check/coordinate-resolution/write/validate/report steps rather than repeating them, and states only the D6/D11/D12 deltas: no durability test, unconditional `category`/`visibility`, the D11 recategorize path with its worked field-preservation example and required report line, one restaurant per invocation. `poi-add/SKILL.md` itself: zero edits, confirming D6's claim.
5. **Docs** — `docs/travel-workflow.md` (overview exception line, Track B split into the two D7 inclusion paths naming `/poi-add-restaurant` directly, the category table's new `restaurant` row plus the `food` row's updated cross-reference, the previously-missed inline `Poi.category` enum line, and a new Track C line naming D11's stale-override risk class), plus the enum lists in `docs/implementation/city-data-contract.md`, `docs/architecture/technical-architecture.md`, and `CLAUDE.md`.

`MEMORY.md` was deliberately **not** touched — the plan names it orchestrator-owned, and this repo's own rule (`CLAUDE.md`: "implementation sessions report instead of editing plans") applied here since nothing was committed this session for it to land alongside.

**Verification**: `npm test` (67/67), `npm run typecheck`, `npm run lint`, `npm run validate:pois`, `npm run build` all clean, both before and after the manual pass below. `git diff --stat -- src/data/pois.json` empty throughout — confirmed no data migration occurred.

**Manual checks, done live** rather than deferred to Kevin's own pass: installed Playwright + Chromium into the scratchpad (not a project dependency), started the dev server, and inserted one throwaway `category: "restaurant"` POI (Munich) directly into `pois.json` to drive the running app — reverted with `git checkout` immediately after, confirmed clean via `git diff --stat` a second time. Confirmed by screenshot: the search sheet renders the 🍷 icon for the restaurant-category result; the map marker renders `#8b5cf6` purple at street zoom, clearly distinct from the default blue and hotel red; the editor's category `<select>` lists "Restaurant" as a sixth option; toggling the popup's Visited checkbox and saving flips the marker to green once "Hide visited places" (default-on) is switched off — confirming D3's precedence (visited wins over restaurant purple) holds in the running app, not just in the expression's written order. No console errors at any step.

**Not performed** (require the real skill flow with a live Google Maps link, or physical hardware, so left as genuinely manual, operator-side checks rather than simulated): actually invoking `/poi-add-restaurant` and a plain `/poi-add` end-to-end to compare behavior, the recategorize-via-stub report-line check against a real existing POI, and the post-deploy iPhone/iPad on-device pass.

**Not committed.** Full diff and verification results were reported in-session; waiting on explicit approval before `git add`/`commit`/`push`.
