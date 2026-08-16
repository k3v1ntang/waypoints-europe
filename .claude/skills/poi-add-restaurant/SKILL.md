---
name: poi-add-restaurant
description: Add one hand-picked priority restaurant to pois.json, unconditionally category "restaurant" and visibility "always". Manual invocation only — no durability test, no auto-trigger from pasted links.
argument-hint: [one maps link + optional note]
disable-model-invocation: true
allowed-tools: Bash(npm run validate:pois:*)
---

Delegating stub (restaurant-poi-plan D6) — this does **not** repeat `poi-add`'s
steps. Follow `poi-add/SKILL.md`'s dedup-check, coordinate-resolution,
write/validate/report steps as written, with these deltas:

- **No durability test.** Invoking this command *is* the entire inclusion
  criterion — skip `poi-add`'s step 1 entirely.
- `category` is unconditionally `'restaurant'` — never run `poi-add`'s
  category-mapping-table lookup.
- `visibility` is unconditionally `'always'` (D12) — state this explicitly in
  what gets written; never leave it implicit or inherited.
- **Dedup check may find an existing POI** (`food`/`landmark`, sometimes
  already the same place) instead of a clean add. If so, this is a
  **recategorize**, not an addition — see below (D11). Do not silently fold
  it into a generic "added" report line.
- **One priority restaurant per invocation.** If several need adding, run
  this command once per link — do not batch a multi-link message the way
  `poi-add` does.

## Recategorize case (D11)

Before recategorizing an existing POI in the repo, check whether either
device might be holding a pending edit on it; if in doubt, export and merge
any pending changesets for that POI *first* (`poi-merge-edits` skill), then
recategorize — a stale on-device `category` override can otherwise silently
revert the recategorization on next merge with no conflict raised (same
failure shape as Visited POI's original D4 bug, on this new trigger).

Worked example — keep `id`, `coordinates`, `googleMapsUrl`, `description`,
`walkingTourNotes`, `photos`, and `visited` all untouched; set
`category: "restaurant"`; **append** (never overwrite) any new note to the
POI's existing `notes` field. The id never changes — `generatePoiId` slugs
from name+city, not category.

The report (mirroring `poi-add`'s report-and-wait step) must call out a
recategorization as its own explicit line —
`recategorized <id>: food → restaurant` — never silently folded into a
generic "added" summary, so it's consciously reviewed before commit.

$ARGUMENTS
