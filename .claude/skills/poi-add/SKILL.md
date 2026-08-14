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
