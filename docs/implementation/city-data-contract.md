# City Data Contract (Amsterdam + Paris Disneyland handoff)

This document defines the exact data shape this repo expects when Amsterdam and Paris Disneyland content is handed off from the **separate, external AI-assisted trip-research project** (outside this repo) that is doing the actual research for the August 2026 trip.

**Why this exists**: Phase 4 in `docs/planning/2026-08-trip-improvement-plan.md` originally assumed Amsterdam content would come from a Rick Steves guidebook via the existing 8-step walking-tour pipeline (`docs/implementation/walking-tour-implementation-guide.md`). That's no longer the case — the research is happening in a different project entirely. This contract exists so that whenever that project's output lands, ingesting it here is mechanical: validate the shape, drop it into `pois.json`, run the validator, done. No manual guidebook transcription, no lat/lng swap step, no reference-doc intermediate.

**Status**: contract only — no Amsterdam/Paris data exists in this repo yet. Nothing here is populated until the external project delivers.

---

## Target shape: one JSON object per city

Ask the external project to hand back JSON already matching this shape (same shape `pois.json` uses today), with coordinates **already in `[longitude, latitude]` order** — Mapbox's format. There's no requirement to also produce a human-readable `latitude, longitude` intermediate doc this time, since the source isn't a printed guidebook that needs manual extraction.

```json
{
  "id": "amsterdam",
  "name": "Amsterdam (AMS)",
  "country": "Netherlands",
  "countryCode": "NL",
  "centerCoordinates": [4.9041, 52.3676],
  "pois": [
    {
      "id": "amsterdam-poi-slug",
      "name": "POI Name",
      "coordinates": [4.8952, 52.3702],
      "category": "landmark",
      "visibility": "always",
      "description": "Main description shown in the popup.",
      "walkingTourNotes": "Historical/contextual notes shown when 'Discover More' is expanded, or when a walking tour is active.",
      "notes": "Practical tips: hours, cost, address.",
      "googleMapsUrl": "https://maps.app.goo.gl/xyz",
      "photos": []
    }
  ]
}
```

### Field notes

| Field | Required | Notes |
|---|---|---|
| `id` | yes | `{city}-{slug}`, kebab-case, unique across the whole file |
| `name` | yes | `"City Name (CODE)"` — matches the existing convention (e.g. `"Helsinki (HEL)"`) |
| `coordinates` | yes | `[longitude, latitude]` — **not** `[lat, lng]` |
| `category` | yes | one of `landmark \| culture \| food \| practical \| hotel` |
| `visibility` | yes | `always` (shown regardless of active tour) or `walkingTour` (shown only while that POI's tour is active) |
| `description` | yes | user-facing summary |
| `walkingTourNotes` | no | omit or empty string if there's no deeper historical context to show |
| `notes` | no | omit or empty string if there's nothing practical to add (an empty string, not `undefined` — see `poiValidation.js`) |
| `googleMapsUrl` | no | direct link if available |
| `photos` | yes | always `[]` at handoff time — Phase 3's separate pipeline (`docs/implementation/photo-pipeline-guide.md`) populates this later, independently |

---

## Walking tour object (Amsterdam only, if the research includes one)

```json
{
  "id": "amsterdam-city-walk",
  "name": "Amsterdam City Walk",
  "description": "One-sentence summary.",
  "difficulty": "easy",
  "estimatedTime": "2 hours",
  "distance": "~3 km",
  "mapImage": "/maps/amsterdam-city-walk.jpg",
  "poiSequence": ["amsterdam-poi-1", "amsterdam-poi-2"]
}
```

- `poiSequence` must list every POI id in walking order, and every id must exist in that city's `pois` array (checked by the validator).
- `mapImage`: a route-map image isn't required for launch — if the external project doesn't produce one, this can be a screenshot grabbed later, or omitted while the field stays a known follow-up.
- `difficulty`: `easy | moderate | challenging`.

---

## Paris Disneyland: logistics-shell scope only

Per plan decision D3: Paris Disneyland gets **pins only**, no walking tour, and no in-park content (the official Disneyland Paris app already covers live wait times and the park map — Waypoints doesn't compete there). The external project's Paris output should be limited to:

- Hotel
- Dining reservations
- Marne-la-Vallée station
- Pre/post-park stops (e.g. a meal before heading to the park, luggage storage, etc.)

Same POI object shape as above; just a much shorter `pois` array and no `walkingTours` entry for this city.

---

## Ingestion steps once the external project delivers

1. Validate the delivered JSON against this contract (field names, enums, coordinate order) before touching `pois.json`
2. Append the city object(s) to `pois.json`'s `cities` array; append any walking tour object(s) to `walkingTours`
3. Run `npm run validate:pois` (Phase 0's validation script — catches bounding-box violations, missing required fields, dangling `poiSequence` references)
4. `npm run dev`, spot-check the new city in the dropdown, POI popups, and (if present) the walking tour FAB/bottom sheet
5. Commit, then proceed with Phase 4's remaining validation/offline-test steps per the plan
