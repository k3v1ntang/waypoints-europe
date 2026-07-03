# Waypoints Europe — August 2026 Trip Improvement Plan

**Created**: July 2, 2026
**Trip**: Amsterdam + Paris Disneyland, August 2026 (~7 weeks out)
**Working branch strategy**: One feature branch per phase, merged to `main` (auto-deploys to Netlify) only after on-device testing. Current branch: `feature/offline-reliability`.

---

## 1. Goals

From the October 2025 trip retrospective (see `Travel POI App - Waypoints.md` in MOSAIC vault) and July 2026 planning discussion:

1. **Edit and add POIs from the web interface** during the trip, instead of editing the codebase — especially for restaurants discovered on the go.
2. **A more mature, reliable app** for the August 2026 trip. The #1 pain point from the last trip: **the app failed in airplane mode** despite the offline PWA design.
3. **Display personal photos for key POIs** (low-effort scope).

---

## 2. Codebase Assessment (July 2026)

### Architecture reality

- Fully **static PWA**: `pois.json` (6 cities, 100 POIs) is imported at build time and compiled into the JS bundle. No backend, no database, no auth.
- Deployed to Netlify from GitHub (`main` auto-deploys). Public URL: https://waypoints-europe.netlify.app/
- Photo infrastructure half-exists: every POI has an empty `photos: []` array; YARL lightbox is installed but used only for tour map images; no `public/images/` directory yet.
- `CityNavigation` derives the city list entirely from `pois.json` — **adding new cities is data-only, no code changes**.
- Stack verdict (verified July 2026): Vite 7 + React 19 + `vite-plugin-pwa` + `mapbox-gl` v3 **remain current best practice**. No rebuild or framework migration warranted.

### Root causes of the airplane-mode failure (verified in code)

1. **Mapbox `sku` token rotation (critical, newly discovered)**: `mapbox-gl` appends a `sku=` query parameter to every tile request that **rotates each browser session** (confirmed in `node_modules/mapbox-gl/dist/mapbox-gl.js`). The service worker caches by full URL including query string, so tiles cached in one session are **never matched in the next session** — guaranteeing offline failure across sessions regardless of cache size. Fix: `matchOptions: { ignoreSearch: true }` on the Mapbox runtime cache.
2. **`maxEntries: 100` tile cache cap** (`vite.config.js`): one city at street-level zoom is several hundred tiles, so entries evict almost immediately. Fix: raise to several thousand.
3. **Runtime-fetched assets not precached**: `/guides/*.md` and `/maps/*.jpg` are fetched at runtime (`GuideViewer.jsx` fetches `/guides/{id}.md`) but Workbox's default precache glob only covers `js/css/html` — **walking tour guides and maps break entirely offline**. Fix: extend `globPatterns`. All assets verified under Workbox's 2MB per-file limit (~3MB total).

### Other verified findings

| Finding | Location | Severity |
|---|---|---|
| Stale-closure bug: popup's "Stop X of Y" walking-tour banner can never display (`selectedTour` captured as `null` in run-once effect) | `Map.jsx:453`, flagged by `exhaustive-deps` at `Map.jsx:567` | Existing user-facing bug |
| Popup content built as raw HTML string with fragile escaping (only `"` escaped) | `Map.jsx:500-537` | Blocks editing + photos features |
| ESLint fails: 2 errors (incl. unused `popup` var at `Map.jsx:492`), 1 warning | repo-wide | Hygiene |
| POI with missing `notes` renders literal "undefined" in popup | `Map.jsx:526` | Minor |
| No error boundary; any uncaught error blanks the app; Mapbox init failure is silent | `App.jsx`, `main.jsx` | Bad mid-trip failure mode |
| All deps outdated; `npm audit`: 17 vulnerabilities (9 high, concentrated in dev tooling) | `package.json` | Hygiene |
| `index.html`: default Vite favicon, no `theme-color` meta, no explicit `apple-touch-icon` link, no description | `index.html` | Polish (iOS-first app) |
| Mapbox token in public bundle without URL restriction | Mapbox dashboard | Security (free-tier abuse risk) |
| `mapbox-gl` in `devDependencies` | `package.json` | Cosmetic |
| CLAUDE.md drift: says React 18 / Vite 5 / 72 POIs; actual React 19 / Vite 7 / 100 POIs | `CLAUDE.md` | Doc hygiene |
| Inline styles throughout components; `theme.js` used by only one component | all components | Deferred (cosmetic) |

---

## 3. Decisions and Rationale

### D1. POI editing: local-first (IndexedDB) now, GitHub sync later — "hybrid"

Options considered:
- **A. Local-first (chosen for August)**: edits stored in IndexedDB on-device as an overlay merged over `pois.json` at load; "Export edits" button to merge back into the repo post-trip.
- **B. GitHub commit-back**: Netlify Function commits to `pois.json`; cross-device sync but saving requires network + auth on a public URL. **Post-trip enhancement.**
- **C. Backend (Supabase)**: most mature long-term, but largest change and riskiest before a trip. Rejected for now.

Rationale: (1) editing must work offline — the moment you add a restaurant is the moment you may have no signal, and B's offline queue is its hardest, riskiest part; (2) solo user removes the main argument for a backend; trade-off accepted: iPhone edits won't appear on iPad until export/merge; (3) keeps `pois.json` in git as source of truth; the form/model/merge logic is all reusable when B is added later; (4) no new failure modes (auth, tokens, functions, third-party outages) before the trip.

Note: tight Google Maps integration for live restaurant info is impractical without the paid Places API; a "paste Google Maps link" field + geolocation capture covers most of the value.

### D1a. Confirmed July 2, 2026: solo user

The user is the only person using the app during the trip. D1's local-first trade-offs (no cross-device sync until export) are confirmed acceptable.

### D2. Photos: display repo-hosted photos only

Photos are optimized (HEIC → WebP/JPEG, ~200KB, **EXIF/GPS stripped** — public URL) and committed to `public/images/`, listed in each POI's `photos` array, rendered as popup thumbnails wired to the existing YARL lightbox. **In-trip photo upload from phone is out of scope** (requires storage backend).

### D3. Trip content: POI pins + walking tour(s)

Amsterdam gets pins + a Rick Steves-style walking tour via the existing 8-step pipeline (source content to be provided). Paris Disneyland gets a **minimal logistics-shell POI set only** (hotel, dining reservations, Marne-la-Vallée station, pre/post-park stops) — confirmed July 2: in-park needs are served by the official Disneyland Paris app (live wait times, park map); Waypoints does not compete there and no in-park effort is spent.

### D4. Offline reliability is top priority; "download city" button is a stretch goal

The cache fixes are trip-critical. The download button (pre-fetch all tiles for a city's bounds) is an **established community pattern** (cf. `leaflet.offline`) but **not an official Mapbox GL JS feature** (official offline regions exist only in native mobile SDKs; Mapbox ToS permits performance caching — fine at personal scale). With the cache fixed, panning around a city on hotel WiFi achieves ~90% of the same result, so the button is nice-to-have, not trip-critical. It must replicate Mapbox's exact tile URL scheme and be validated for cross-session cache hits.

### D5. Trip-usability additions (confirmed July 2, 2026)

Reviewed the plan for day-to-day usefulness (not just reliability) and confirmed:

- **POI search — IN** (Phase 2): client-side name search over the in-memory POI data; results list; tap flies to POI and opens popup. Slots into the existing top-bar UI pattern — explicitly NOT a UI redesign, no deployment/offline impact, no new dependencies. (Optional if trivial: category filter chips.)
- **Remember last-viewed city — IN** (Phase 1): one localStorage key restoring the starting view instead of Europe-wide zoom on every launch. Independent of search/UI work; ~30 min.
- **Favorites / visited state — OUT** for August (user decision; can join the post-trip backlog).
- **Mid-trip change freeze — policy**: after departure, `main` receives data/content commits only (no dependency bumps, no refactors); feature freeze one week before departure, aligned with the week-7 buffer.
- **"Itinerary Gallery" / day-based planning** (from MOSAIC vault notes): consciously parked post-trip — a different product dimension (dates, day ordering).
- **UI visual refresh**: acknowledged desire ("simple and less appealing"); deferred post-trip together with the inline-styles/theme refactor. Search does not depend on or foreclose it.

### D6. Deliberate deferrals (post-trip)

- **`react-map-gl` migration**: would subsume the Phase 2 refactor and is where the codebase should eventually go, but rewriting the riskiest 614-line file wholesale before a trip is exactly the churn to avoid. The targeted Phase 2 refactor moves in its direction.
- **TypeScript adoption**: current default for new projects; migration now is churn without user value. The Phase 0 data validation script covers where the actual bugs live (data). Consider gradual adoption post-trip.
- **Major dependency upgrades**: Vite 8, ESLint 10, `markdown-to-jsx` 9, `@vitejs/plugin-react` 6, `eslint-plugin-react-hooks` 7 — one post-trip upgrade session.
- **Inline-style refactor** and a real test suite: cosmetic / disproportionate effort at this app's size.

---

## 4. Project Plan

### Phase 0 — Guardrails & hygiene (~1 day) — branch: fold into `feature/offline-reliability` or `feature/guardrails`

1. **`pois.json` validation script** (Node, run as `prebuild` so Netlify fails instead of shipping broken data):
   - Coordinates within Europe bounding box (catches the lat/lng swap footgun — swapped European coords land outside it)
   - Unique, well-formed IDs; required fields present (incl. `notes`); valid `category`/`visibility` enums
   - Every `walkingTours[].poiSequence` entry references an existing POI in that city
   - Reused later to validate Phase 2 in-app edits/exports and Phase 4 data entry
2. **Error boundary** with reload button + `map.on('error')` fallback message (no more silent white/black screens)
3. **Fix 2 ESLint errors**; add minimal **GitHub Actions CI** (lint + build on push/PR)
4. **Build stamp** (git SHA/date injected via Vite `define`, shown in city dropdown footer) — answers "is my phone running the latest deploy or a stale SW cache?" during on-device debugging
5. **Within-semver dependency updates** (`npm update` + `npm audit fix`): React 19.2, mapbox-gl 3.25, vite-plugin-pwa 1.3, Vite 7.3, YARL — do *before* offline work so tile caching is validated against current mapbox-gl
6. **`index.html` polish**: real favicon, `theme-color` meta, explicit `apple-touch-icon` link, description meta
7. **USER ACTION — Mapbox dashboard**: add URL restriction to the production token (`waypoints-europe.netlify.app` + localhost); keep an unrestricted token in local `.env` for dev
8. Move `mapbox-gl` to `dependencies`

### Phase 1 — Offline reliability (small-moderate; top priority) — branch: `feature/offline-reliability`

1. `matchOptions: { ignoreSearch: true }` on the Mapbox runtime cache (**the sku fix — the critical one**)
2. Raise `maxEntries` 100 → ~4000
3. Extend Workbox `globPatterns` to precache `md/jpg/jpeg/webp/svg/ico/png` (guides, tour maps, future POI photos)
4. `navigator.storage.persist()` request (protects tile cache and, later, IndexedDB edits)
4a. Remember last-viewed city (localStorage) so the app opens where you left off instead of Europe-wide zoom
5. **Test protocol** (service worker does NOT run under `npm run dev`):
   - Local: `npm run build && npm run preview`, browse a city, kill network (DevTools offline), reload, verify map + tours + guides
   - Netlify **branch deploy** on actual iPhone (note: different origin = separate cache — good for testing, not the final word)
   - After merge: production URL, installed home-screen PWA, browse cities on WiFi, enable **airplane mode, quit and relaunch** (cross-session = validates the sku fix), verify everything
   - Confirm app is used from the **home-screen icon** (installed PWAs are exempt from Safari's 7-day storage eviction; Safari tabs are not)

### Phase 2 — POI editing (moderate; ~3-5 sessions) — branch: `feature/poi-editing`

1. **Pre-work refactor of `Map.jsx`** (~1 session): derive GeoJSON from state, push changes via `setData`; render popup content with React (`createRoot` into popup container) instead of string HTML. Fixes the tour-banner stale-closure bug and the escaping fragility; prerequisite for runtime-changing data.
2. Add/edit form: name, description, notes, category, Google Maps link; coordinates via **tap-on-map** or **use-my-location**
2a. **POI search**: client-side name search in the top bar, results list, tap-to-fly-and-open-popup; doubles as the "find POI to edit" mechanism (category filter chips only if trivial)
3. IndexedDB overlay: edits keyed by POI id (overrides), new POIs with generated ids, deletions as tombstones; merged over `pois.json` at load
4. **Export/backup built EARLY, not last**: export merged JSON via Web Share API (AirDrop to iPad) — mitigates lost-phone data loss and softens the no-sync trade-off
5. Validate edits with the Phase 0 validation rules
6. Post-trip (out of scope now): GitHub commit-back sync (option B)

### Phase 3 — Photos (~1-2 sessions) — branch: `feature/poi-photos`

1. Photo pipeline script: HEIC → WebP/JPEG, resize (~200KB), **strip EXIF/GPS**, output to `public/images/{poi-id}/`
2. List filenames in POI `photos` arrays
3. Thumbnails in the (now React-rendered) popup → existing YARL lightbox
4. Verify photos are covered by the Phase 1 precache and work offline

### Phase 4 — Trip content (low effort per city) — branch: `feature/amsterdam-paris`

1. Add `amsterdam` and `paris-disneyland` cities to `pois.json` (`id`, `name (CODE)`, `country`, `countryCode`, `centerCoordinates`, `pois`)
2. Amsterdam: POI reference doc → pins → walking tour via the 8-step pipeline (**needs Rick Steves Amsterdam source from user**)
3. Paris Disneyland: minimal logistics-shell pins only per D3 (hotel, dining reservations, station, pre/post-park stops) — no in-park content effort
4. Validation script checks all new data; test offline on device

### Stretch — "Download city for offline" button — branch: `feature/city-download`

Compute tile grid for city bounds at z11–16 (a few hundred vector tiles, tens of MB), fetch each so the (now fixed) CacheFirst cache stores them; progress UI. Only after Phase 1 is validated cross-session. Skip without guilt if time runs short.

### Post-trip backlog

GitHub commit-back sync · `react-map-gl` migration · TypeScript (gradual) · major dependency upgrades · inline-style/theme refactor + UI visual refresh · favorites/visited state · itinerary/day-planning ("Itinerary Gallery") · in-trip photo upload · CLAUDE.md/doc sync (or do opportunistically at end of Phase 4)

---

## 5. Risks & Considerations

| Risk | Mitigation |
|---|---|
| iOS evicts web storage after 7 days of disuse | Installed home-screen PWAs are exempt — use the app from the home-screen icon; also `storage.persist()` |
| Trip edits exist only on one device (lost/broken phone) | Export/AirDrop backup built early in Phase 2; occasional backups to iPad during trip |
| SW behavior untestable in dev server | Test via `build && preview` + Netlify branch deploys; final airplane-mode validation on production origin post-merge |
| Branch deploys are a different origin (separate SW/caches) | Treat as functional test only; re-validate offline on production |
| Personal photos on a public URL | Strip EXIF/GPS in pipeline (app already exposes hotel locations — no new class of exposure) |
| Mapbox ToS on offline caching | Performance caching is permitted; personal scale; heavy offline use is officially a native-SDK feature — accepted risk for a personal app |
| mapbox-gl minor bump changes tile URL scheme | Update deps in Phase 0 *before* validating offline in Phase 1 |
| Mid-trip deploys (content fixes) need the SW to update | `registerType: 'autoUpdate'` handles it; open app once online; build stamp confirms which version is running |

## 6. Timeline (trip ~August 2026)

- **Weeks 1–2 (early July)**: Phase 0 + Phase 1, including on-device airplane-mode validation
- **Weeks 2–4 (mid-July)**: Phase 2 (editing), field-test on phone
- **Week 5**: Phase 3 (photos)
- **Weeks 5–6 (late July)**: Phase 4 (content) — can interleave with 2–3 since it's data work
- **Week 7 (early August)**: buffer — full end-to-end rehearsal in airplane mode; stretch goal only if everything is validated. **Feature freeze begins**: from here (and throughout the trip), `main` receives data/content commits only — no dependency bumps, no refactors.

Phases 0, 1, 2, 4 are trip-critical; 3 slots into slack; stretch is optional.
