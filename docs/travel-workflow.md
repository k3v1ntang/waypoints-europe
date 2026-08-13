# Travel Content Workflow — MOSAIC → Google Maps → Waypoints

**Status: v1 (2026-08-13).** Written up after the first live run of this pattern, ingesting the August 2026 Amsterdam/Paris trip. Expect this to evolve — update it in place as the workflow gets used again, rather than letting it go stale the way `city-data-contract.md` briefly did.

## Overview — three systems, three jobs

Three tools cover travel planning end to end. Each has one job; content flows one direction (research → live flagging → durable in-field record), and it does **not** flow back upstream.

| System | Job | Consumed by |
|---|---|---|
| **MOSAIC** (`~/Vaults/MOSAIC/_areas/travel/`) + the `travel-planner` skill (AI Studio) | Deep, pre-trip research. Produces a trip's Itinerary/Planner/Tasks notes and evergreen city/sight/region notes. City notes mark must-visit sights with a `[k]` priority bullet (see `travel-planner`'s `references/conventions.md`) | **Track A**, once per trip |
| **Google Maps** (Kevin's saved lists — country lists, "Want to go", per-city restaurant lists) | Fast, low-friction live flagging. Anything spotted on the go — a driver's tip, a partner's find, a video recommendation — gets pinned here first, because it's the fastest thing to search and save on a phone | **Track B**, continuous |
| **Waypoints** (this repo) | The durable, in-field consumption layer. One `pois.json`, merging both sources above plus on-device corrections made while actually using the app | **Track C** closes the loop back into this repo |

**Waypoints does not write back into MOSAIC.** A POI added via Track B lives in Waypoints only — MOSAIC stays the record of what was *researched*; Waypoints becomes the record of everything that ended up worth remembering, researched or not (decision, 2026-08-13, open to revisiting if it stops making sense).

**Restaurants mostly stay Google-Maps-only** — see the durability test below for the actual line, which is sharper than "no restaurants."

## Track A — Bootstrap (MOSAIC → Waypoints, once per trip)

Run once, when a trip's MOSAIC notes are mature enough to draw from.

1. Read the trip's Itinerary `## Bookings` for hotels (dates, address, confirmation number → `notes`).
2. Read each relevant city note's `## Sights`, take only `[k]`-marked bullets.
3. **Named exception**: a bullet with no `[k]` can still be added if it's a *confirmed, scheduled* part of the trip described elsewhere in the note (e.g. day-trip prose with its own transport block) — the `[k]` marker prioritizes *within* a Sights list, it was never meant to gate out a definite outing described outside one. Call this out explicitly in the commit/PR when it happens (precedent: Zaanse Schans, 2026-08-13).
4. Resolve coordinates + Maps links — see below.
5. Write the city/POI objects into `pois.json`, `npm run validate:pois`, full CI gate, PR.

## Track B — Live flagging (Google Maps → Waypoints, continuous)

Run whenever Kevin drops one or more `maps.app.goo.gl` links, with or without a note.

1. **Durability test** (replaces a flat "no restaurants" rule): does this stay worth knowing about *after* the trip? If yes → Waypoints. If its only value is current hours/reviews/availability → stays in Google Maps.
   - Crosses over: a destination-grade place that happens to serve food (Sea Palace — floating restaurant landmark, Bib Gourmand; Markthal — architectural market hall; Nieuwmarkt — a square, not a specific eatery).
   - Stays in Google Maps: a specific dinner reservation pick, anything whose relevance is "is it open/good this month."
2. **Dedup check**: before adding, a quick look at the target city's existing POIs by name/rough location — Track A and Track B draw from different sources and can independently flag the same place. (Gap identified 2026-08-13, not yet automated — currently a manual glance.)
3. Resolve coordinates + Maps links — see below.
4. Pick a `category` — see the table below.
5. Write the POI, `npm run validate:pois`, commit, push. A one-line note from Kevin (who flagged it, why, any caveat) goes straight into that POI's `notes` field.
6. **Bulk variant**: Google's in-app "Share" only produces a *view* link, not an export. The actual bulk tool is Google Takeout (takeout.google.com, separate from the Maps app) — it exports each saved list as its own CSV, but only `name + Google Maps URL`, no coordinates, so it doesn't remove the per-place resolve step, just batches the link-collection part. **Not built as of this doc** — link-by-link (or pasting several links in one message, which is already handled as a batch) covers everything so far. Worth reconsidering only if a specific list is large enough that 40+ individual round-trips would be the alternative.

## Track C — Field correction (Waypoints → back into this repo)

Run whenever Kevin's actually using the app and something needs fixing (wrong pin position, a note to add, a place to remove).

1. On-device: reposition via tap-on-map, or edit description/notes in the POI editor sheet.
2. **⋯ menu → Export my edits** — exports just the small changeset (not the whole `pois.json`), optionally labeled with a name.
3. Hand the file to Claude; it's merged into `pois.json` directly (the app's own `mergeIncomingEdits` LWW-by-`updatedAt` logic is available via **Import edits** for merging a second person's changeset into the on-device overlay first, if that's the path being used instead).
4. **Self-healing**: once the shipped `pois.json` matches an on-device edit exactly, that edit clears itself on next load — no manual "Reset to original" needed (only fires on an exact match; a full-precision on-device coordinate won't auto-clear against a manually-rounded value someone typed in by hand, so precision matters if you want this to fire).

## Category mapping

The `Poi.category` enum (`landmark | culture | food | practical | hotel`) as actually applied so far — informal until now, written down for consistency across sessions:

| Category | Use for |
|---|---|
| `hotel` | Any accommodation |
| `food` | A place whose primary value is a food/drink experience *and* passes the durability test above (market halls, a landmark restaurant) — not a plain dinner reservation |
| `culture` | Museums, concert halls, arts/nightlife districts, artist quarters |
| `practical` | Errand-type stops — shops, transit-adjacent utility |
| `landmark` | Everything else — monuments, squares, streets, viewpoints, parks |

## Coordinate resolution

Ranked by preference:

1. **claude-in-chrome, live in-browser** — most accurate; reads the actual resolved place pin, not a redirect artifact. Preferred whenever connected.
2. **Fallback (used throughout this trip's ingestion, claude-in-chrome unavailable)**: `WebFetch` the `maps.app.goo.gl` short link — it 302-redirects to a `google.com/maps/place/...` URL carrying `!3d<lat>!4d<lng>` params, which is the actual place pin (more precise than the `@lat,lng,zoom` in the URL path, which is just the viewport center at share time).
3. **Last resort, no link at all**: WebSearch a Wikipedia infobox (most landmarks) or OpenStreetMap Nominatim geocoding by address (hotels).

`googleMapsUrl` field: prefer the exact link Kevin shared (already resolved, most precise) or one built as `query=<Name>+<City>` when constructing from scratch — a name+city search opens the real Google-indexed place card (photos/hours/reviews) on tap, where `query=<lat>,<lng>` only drops a bare pin (decision, 2026-08-12, see PR #8).

## Related

- `travel-planner` skill (AI Studio), `references/conventions.md` — the `[k]` marker, city-note structure, sourcing rules that produce Track A's input.
- `docs/implementation/city-data-contract.md` — the `Poi`/`City` JSON shape this workflow writes into.
- MOSAIC `_areas/travel/Travel Workflow.md` — the vault-side pointer to this doc.
