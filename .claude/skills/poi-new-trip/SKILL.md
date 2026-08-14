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
