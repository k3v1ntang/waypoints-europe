# Waypoints — July 2026 Modernization Plan

**Created**: July 3, 2026
**Context**: Follows the July 2026 security review and stack assessment conversation. Captures every action item, decision, and rationale from that discussion as the implementation blueprint.
**Working branch strategy**: One feature branch per phase, merged to `main` (auto-deploys to Netlify) only after on-device testing on iPhone/iPad.
**Timing anchor**: August 2026 trip (~6 weeks out). Phases 1–3 should land before the trip; Phases 4–5 are flexible; Phase 6 is post-trip.
**Status**: In progress — Phases 1–3 merged 2026-07-04

---

## 1. Goals

From the July 2026 security review and product-direction discussion:

1. **Harden the app** per the security review findings (only the ones that survived stress-testing).
2. **Eliminate the Mapbox token and per-map-load billing** ahead of sharing the app with other users — switch to MapLibre GL JS + OpenFreeMap.
3. **Modernize the toolchain**: pending dependency majors (Vite 8, markdown-to-jsx 9, plugin-react 6, ESLint 10) plus a test baseline.
4. **Adopt TypeScript incrementally**, data layer first.
5. **Modernize the UX** to a Liquid-Glass-inspired design language matching iOS/iPadOS 26 — via a styling-layer pass, not a framework change.
6. **Longer-term product direction**: evolve from personal Europe trip planner to a shareable app showcasing **Banff and adjacent areas**, with guaranteed regional offline maps via PMTiles.

---

## 2. Security Review Summary (July 2026)

### Clean results (verified, no action needed)

- `npm audit`: **zero vulnerabilities** across 511 packages.
- `.env` never committed anywhere in git history; `.gitignore` covers it and `photo-inbox/`.
- No `innerHTML` / `eval` / `dangerouslySetInnerHTML` sinks; popups are React-rendered (React handles escaping).
- Photo pipeline strips EXIF/GPS by default (sharp) and uses `execFileSync` (no shell injection).
- IndexedDB edit store holds only the user's own on-device data.

### Findings and stress-test verdicts

| # | Finding | Stress-test verdict | Action |
|---|---|---|---|
| F1 | Mapbox `pk.` token in client bundle | Normal for Mapbox; abuse risk mitigated by dashboard URL restriction | ✅ **Done** (user set URL restriction, July 2026). Becomes moot entirely after Phase 1 (MapLibre) |
| F2 | `googleMapsUrl` not scheme-validated (`javascript:` href risk via in-app editor) | **Dropped as a security item.** Verified empirically: React 19's production bundle replaces any `javascript:` href with a throwing URL (`react-dom-client.production.js`, "React has blocked a javascript: URL as a security precaution"). Residual value is data quality only (catching pasted non-URLs) | Fold an `https:` scheme check into `poiValidation.js` during Phase 4 (TypeScript touches that file anyway). Not a standalone task |
| F3 | `markdown-to-jsx` parses raw HTML in guide files (`GuideViewer.jsx`) | **Keep.** Verified all 5 guide files contain zero `<` characters, so `disableParsingRawHTML: true` is zero-cost. Threat is thin today (self-authored content) but Phase-4-external-content and share-with-others plans change that. markdown-to-jsx v9's default tagfilter (escapes `<script>` etc.) covers most of it after the Phase 3 upgrade; this flag makes it total | Phase 2, one line |
| F4 | No Content-Security-Policy or security headers (Netlify serves defaults; no `netlify.toml` / `public/_headers` in repo) | Worthwhile defense-in-depth for a static site; neutralizes most injection classes outright | Phase 2, `public/_headers` |

### Netlify-specific notes

- Deployed to Netlify from GitHub (`main` auto-deploys); token lives in Netlify env vars (build-time only).
- Single-route SPA → no redirect rules needed.
- Deploy previews (`deploy-preview-*--*.netlify.app`) break the map under Mapbox URL restriction unless a `*.netlify.app` wildcard is included — **moot after Phase 1**, another small reason to do MapLibre first.
- CSP must be written **after** the MapLibre switch (allowed domains depend on the tile provider).

---

## 3. Decisions and Rationale

### D1. No framework migration — keep React 19 + Vite + vite-plugin-pwa

Evaluated Next.js / Remix / SvelteKit: their value (SSR, routing, server data fetching) doesn't apply to a no-backend, single-route, offline-first static PWA. A meta-framework would add a layer to fight against for the same offline behavior. This verdict covers the UX modernization too (see D4): the dated look is the styling layer, not the framework — **138 inline `style={{}}` blocks and zero `backdrop-filter` usage** measured in `src/components/`.

### D2. Switch `mapbox-gl` → MapLibre GL JS + OpenFreeMap tiles

Drivers, in order of weight:
1. **Sharing plans**: Mapbox bills per map load (50k free/month, then ~$5/1,000) — a cost that scales with success. MapLibre + OpenFreeMap = no token, no registration, no usage limits, no bill.
2. **ToS gray area removed**: the service worker persists Mapbox tiles for 30 days, which sits uneasily with Mapbox's terms restricting client-side tile storage. OpenFreeMap has no such restriction — offline pre-caching becomes unambiguously legitimate.
3. **PMTiles prerequisite**: MapLibre is the only renderer with the `pmtiles://` protocol ecosystem needed for Phase 6 (Banff).

Verified near drop-in: the complete Mapbox API surface used in `Map.jsx` (`Map`, `Popup`, `NavigationControl`, `GeolocateControl`, `LngLatBounds`, `flyTo`, `fitBounds`, `queryRenderedFeatures`, GeoJSON clustering) exists identically in MapLibre (forked from Mapbox GL v1 in 2020). No account or web service setup required — OpenFreeMap is a keyless public tile CDN.

**Offline caching is unchanged in mechanism**: the Workbox `runtimeCaching` rule intercepts tile HTTP requests regardless of library. Only the `urlPattern` changes (`api.mapbox.com` → `tiles.openfreemap.org`; style, glyphs, and sprites are on the same domain, so one rule covers everything). The `sku`-rotation `ignoreSearch` workaround becomes unnecessary.

**Reversibility**: single commit on a feature branch; the reverse migration is the same five steps backwards (`git revert` works even months later). Only one-way doors are Mapbox-proprietary features (Standard 3D style, Mapbox geocoding) — none currently used.

**Known trade-offs**: OpenFreeMap is donation-funded, no SLA (self-hostable if it falters; Protomaps self-hosting as fallback). Map style changes from Mapbox `streets-v12` to OpenFreeMap Liberty/Bright/Positron — compare styles on-device before committing (one-line swap).

### D3. PMTiles deferred to the Banff phase (Phase 6)

Two offline models compared:
- **Workbox runtime cache (current)**: opportunistic — caches only what was browsed, at browsed zooms. Fails gradually and invisibly (missing tile discovered on the street corner, offline). Fine for the personal Europe use case: discrete city centers, hotel WiFi priming, single informed user.
- **PMTiles**: packaged dataset — single-file archive of *every* tile for a region at *all* zooms, downloaded once to the device (OPFS storage), read via `pmtiles://` protocol plugin. Fails loudly up front (download completed or didn't). Requires: extract pipeline (`pmtiles extract` from Protomaps' free planet builds; city/region extracts are tens of MB), range-request-capable hosting (Cloudflare R2 free tier — Netlify not suitable for large files), download-management UI, locally bundled fonts/sprites. ~2–4 days.

**Decision**: runtime cache for the August trip (built, validated, zero new engineering). PMTiles for Banff, where it fits almost perfectly: one contiguous bounded region (Banff–Canmore–Lake Louise–Icefields corridor), users genuinely offline in the mountains, and shared users who will never perform a priming ritual. This resurrects the previously dropped "city download" stretch goal (commit `fbaa184`) in regional form. The two sources coexist: OpenFreeMap runtime caching stays the default for Europe cities.

### D4. UX modernization = styling-layer pass, not a rebuild

Target: iOS 26 Liquid Glass language. A map app is the ideal shape for it (iOS 26 Apple Maps is the reference: edge-to-edge map content, few floating translucent capsules/sheets). The app already has the right skeleton (map, city dropdown, FAB, bottom sheet, popups) rendered as flat opaque boxes.

Technical scoping (verified against 2026 practice):
- **Frosted-glass material (the 90%)**: `backdrop-filter: blur(~16px) saturate(~1.5)` + translucent fill + hairline borders + capsule radii + layered shadows. Safari supports this natively (`-webkit-` prefix) — the iOS/iPadOS PWA targets are the best case.
- **True refraction/lensing (the 10%)**: SVG displacement in `backdrop-filter` is **Chrome-only** — skip it; primary platform is Safari.
- **Constraints**: glass only on floating controls (blur over the live WebGL map canvas costs GPU — small surfaces matter doubly); no text on near-transparent fills (legibility is glassmorphism's known failure mode); honor `prefers-reduced-transparency` with opaque fallback.

Approach: extract the 138 inline style blocks into CSS with design tokens (CSS custom properties; `theme.js` becomes tokens); define one `glass` material class; apply per surface (city dropdown → floating capsule; MapLibre controls → glass buttons via `.maplibregl-ctrl` CSS; POI popup → glass card; bottom sheet → glass sheet with grab handle); add spring motion via the `motion` library (Framer Motion successor); `-apple-system` font stack; light map style (Positron) reads more modern; dark mode via `prefers-color-scheme` as follow-on. Plain CSS modules + tokens over Tailwind at this scale (11 components) — teaches fundamentals first; Tailwind remains an option later.

Proof-of-concept first: restyle the **city dropdown** alone, judge on iPhone, then commit to the full pass.

### D5. TypeScript: incremental, data layer first

Vite compiles TS natively, zero config change. `tsconfig.json` with `allowJs: true`, then convert in value order: `poiValidation.js`, `mergePois.js`, `editStore.js`, `usePoiData.js` first — typing the `Poi`/`City`/`WalkingTour` shapes is where TS earns its keep. **Components are not converted separately**: Phase 5 (per D8) rewrites or deletes most of them, so they're written as `.tsx` during that rebuild instead — converting them first would be throwaway work. Whatever survives Phase 5 untouched gets a small mop-up conversion at the end. (For a Python developer: close to type hints + mypy, enforced at build time.)

### D6. Dependency majors verified safe (July 2026)

- **Vite 7 → 8**: Rollup → Rolldown swap; compatibility layer auto-converts config; this repo's `vite.config.js` uses nothing exotic. `vite-plugin-pwa` works with Vite 8 (vite-pwa/vite-plugin-pwa#918).
- **markdown-to-jsx 7 → 9**: removed `ast` and `namedCodesToUnicode` options (unused here); import moves to `markdown-to-jsx/react`; v9 escapes dangerous HTML tags by default (partially covers F3).
- **ESLint 9 → 10, plugin-react 5 → 6, globals 16 → 17**: trivial; flat config already in use.
- CI (lint + build + POI validation) catches regressions.

### D7. Banff product direction

Banff slots into the existing data model as another "city" entry in `pois.json` (center coordinates, POIs, scenic-drive variants of walking tours) — **data-only, no code changes** for the basic case. Optional later: MapLibre terrain (hillshade/contours via a DEM tile source) — an additive layer, not a rethink. Park it with Phase 6.

### D8. Interaction restructure: consolidate controls into an Apple-Maps-shape bottom bar

**Diagnosis (verified in code, July 2026)**: four control clusters in three visual grammars — top-left custom city pill with **Export POI data buried as the last item of the city menu**; top-right native map chrome with the search button squeezed beside it (`right: 54px`); bottom-right two stacked Material-style emoji FABs; differently-styled bottom sheets. This violates iOS 26 HIG grouping (related actions share glass-background groups, organized by function and frequency); stacked FABs are a documented 2026 anti-pattern; and the two most-used controls (city switch, search) sit in the hardest one-handed reach zone while the thumb-friendly bottom third is underused.

**Decision**: converge on the Apple Maps iOS 26 pattern:
- **One bottom-anchored glass control bar** (a collapsed sheet): search field + grouped action buttons (Tours with badge, Add Place) + a **⋯ More overflow menu**.
- **Export moves to the ⋯ menu** (with the pending-edits badge) — it's a data-management action, not navigation. The ⋯ menu is also the future home of settings, dark mode, and Phase 6's "Download Banff maps".
- **City selection moves into the expanded search sheet** as a chip row/section (6–8 cities); the top-left pill is removed or reduced to a passive current-city label.
- **Map chrome slimmed on touch**: hide zoom/compass (pinch/rotate gestures cover them; Apple Maps ships no zoom buttons), keep a single glass geolocate button; keep zoom controls on desktop.

**Tied to Phase 5, not a separate task**: restyling the current layout would cement the wrong structure, and the new bottom bar is itself a glass component — the IA rebuild and the material are one construction job. **Consequence for Phase 4**: components are *not* TS-converted ahead of Phase 5; new/rewritten surfaces are born `.tsx` (see Session Execution Map, §5).

---

## 4. Phases

Each phase includes a **cold-start prompt** (paste into a fresh Claude Code session in this repo) and a **suggested model**. Rationale for model fit: mechanical/verified work → Sonnet 5; design judgment or new architecture → Fable 5 (or Opus 4.8).

**Phases define scope; sessions define execution.** Which phases share a session, the ordering constraints, and the subagent policy are in §5 (Session Execution Map).

---

### Phase 1 — MapLibre + OpenFreeMap swap ✅ (merged 2026-07-04)

**Effort**: ~half a day (most of it on-device offline verification)
**Branch**: `feature/maplibre`, single commit for clean reversibility
**Suggested model**: **Sonnet 5** — the migration steps are fully specified and verified; no open design questions.

Steps:
1. `npm uninstall mapbox-gl && npm install maplibre-gl`
2. `Map.jsx`: `import maplibregl from 'maplibre-gl'` + `'maplibre-gl/dist/maplibre-gl.css'`; rename `mapboxgl.` → `maplibregl.`
3. Delete `mapboxgl.accessToken` line; style URL → `https://tiles.openfreemap.org/styles/liberty` (compare `bright`/`positron` on-device)
4. `vite.config.js`: runtime cache `urlPattern` → `/^https:\/\/tiles\.openfreemap\.org/`; drop the `sku` comment; `ignoreSearch` optional to keep; rename `cacheName` and add a one-time cleanup of the orphaned `mapbox-cache` runtime cache
5. **Rename CSS selectors** (gap found in stress test, July 2026): `App.css` and `index.css` contain 8+ rules targeting `.mapboxgl-popup-content`, `.mapboxgl-popup-close-button`, `.mapboxgl-popup-tip`, `.mapboxgl-ctrl-bottom-*`, `.mapboxgl-map` — MapLibre renames all of these to `.maplibregl-*`. Without this step, popup styling and the iPhone safe-area attribution handling silently break
6. Clean up: remove `VITE_MAPBOX_TOKEN` from `.env` and the Netlify env vars; update `CLAUDE.md` references to Mapbox
7. **Verify on iPhone**: map loads, clustering, tours, popups (styled correctly), geolocate, and airplane-mode offline after browsing a city; confirm "© OpenStreetMap" attribution is visible (required by ODbL, and the style config must not drop it); **verify the already-installed PWA picks up the new service worker and still works offline after the update** — the update path, not just a fresh install, is where the October 2025 failure class lives
8. **Style-quality check**: browse the Liberty style at street zoom in the trip cities (including Amsterdam and Paris, whose tiles exist regardless of POI data) — label density, POI contrast, transit visibility; compare `bright`/`positron` if Liberty disappoints

Success criteria: full feature parity including popup CSS; offline works across an app restart (the bug class from the October 2025 trip) *and* across a PWA update; attribution visible; no Mapbox requests in the network log.

**Post-merge reminder (user request, July 2026)**: after Session A merges and is verified, the user will ask the orchestrator for the full **Mapbox account teardown** steps — delete/rotate the access token, remove any stored payment exposure, and confirm nothing (repo, Netlify, Mapbox dashboard) can generate accidental charges. Step 6 covers the repo/Netlify side; this covers the Mapbox-account side.

**Cold-start prompt**:
> Implement Phase 1 of docs/planning/2026-07-03-modernization-plan.md: swap mapbox-gl for MapLibre GL JS + OpenFreeMap tiles. Follow the steps and success criteria in the plan exactly — single commit on a feature/maplibre branch, don't touch anything outside the migration scope. All Mapbox API usage in Map.jsx was verified to exist identically in MapLibre. Leave on-device iPhone verification to me; tell me exactly what to check, including the airplane-mode-across-restart scenario.

---

### Phase 2 — Security & Netlify hardening ✅ (merged 2026-07-04)

**Effort**: ~1–2 hours (mostly CSP testing)
**Branch**: `feature/hardening`
**Depends on**: Phase 1 (CSP domains depend on tile provider)
**Suggested model**: **Sonnet 5** — small and well-specified, but CSP interactions with MapLibre (`worker-src blob:`, `img-src data: blob:`) need care.

Steps:
1. `GuideViewer.jsx`: add `disableParsingRawHTML: true` to Markdown options (F3)
2. Create `public/_headers` with `Content-Security-Policy` (script-src 'self'; connect/img sources for tiles.openfreemap.org; `worker-src blob:` for MapLibre), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
3. Verify guides render unchanged and map loads with CSP active (test on a deploy preview before merging)

Success criteria: all 5 guides render identically; no CSP violations in the console on map load, tour view, photo lightbox, or geolocation.

**Cold-start prompt**:
> Implement Phase 2 of docs/planning/2026-07-03-modernization-plan.md: add disableParsingRawHTML to GuideViewer's markdown-to-jsx options, and create public/_headers with a CSP + security headers for Netlify. The app now uses MapLibre + tiles.openfreemap.org (Phase 1 is merged) — build the CSP for that, including worker-src blob:. Verify every guide still renders and list the manual checks I should run on the Netlify deploy preview before merging.

---

### Phase 3 — Dependency majors + test baseline ✅ (merged 2026-07-04)

**Effort**: ~half a day
**Branch**: `feature/deps-2026-07`
**Suggested model**: **Sonnet 5** — mechanical upgrades with verified migration notes; test-writing for pure functions is well-bounded.

Steps:
1. **Pin Node first** (gap found in stress test): Vite 8 requires Node 20.19+/22, CI already uses 22, but the Netlify build image is unpinned (no `.nvmrc` / `netlify.toml` in repo) — add `.nvmrc` with `22` so local, CI, and Netlify agree before the upgrade lands
2. Upgrade: `vite@8`, `@vitejs/plugin-react@6`, `vite-plugin-pwa` (Vite-8-compatible release), `markdown-to-jsx@9` (import from `markdown-to-jsx/react`), `eslint@10` + plugins, `globals@17`
3. Fix any config/lint fallout (compat layer should auto-convert `vite.config.js`; expect little)
4. Add **Vitest** (a major that supports Vite 8 — check its peer range at install time) with tests for the pure logic where a silent bug would corrupt trip data: `poiValidation.js`, `mergePois.js`, and the raw-text photos-array rewriter in `scripts/process-photos.js`
5. Add `npm test` to `.github/workflows/ci.yml`
6. `npm run build` + PWA smoke test (service worker still generated, precache manifest intact)

Success criteria: clean lint, green tests in CI, production build installs and works offline on iPhone as before.

**Cold-start prompt**:
> Implement Phase 3 of docs/planning/2026-07-03-modernization-plan.md: upgrade the pending dependency majors (Vite 8, markdown-to-jsx 9 via the /react entry point, plugin-react 6, ESLint 10, globals 17, plus a vite-plugin-pwa release compatible with Vite 8), then add Vitest with tests for poiValidation.js, mergePois.js, and the photos-array rewriter in scripts/process-photos.js, and wire npm test into the CI workflow. Verify the production build still generates the service worker and precache manifest correctly.

---

### Phase 4 — TypeScript, incrementally

**Effort**: ~1–2 days cumulative, across sessions; independently shippable slices
**Branch**: one branch per slice (e.g., `feature/ts-data-layer`)
**Suggested model**: **Sonnet 5** for the conversion mechanics; escalate to **Fable 5** only if a gnarly typing question emerges (unlikely at this codebase's complexity).

Slices, in value order:
1. `tsconfig.json` (`strict`, `allowJs: true`) + convert the data layer: `poiValidation`, `mergePois`, `editStore`, `usePoiData` — define `Poi`, `City`, `WalkingTour`, `EditRecord` types. **Include the F2 leftover here**: `googleMapsUrl` must parse as a URL with `https:` protocol in `getPoiErrors`
2. Convert `scripts/validate-pois.js` and hooks
3. **Components: deferred to Phase 5** (D8) — new/rewritten surfaces are born `.tsx`; survivors get a mop-up conversion at the end of Phase 5

Success criteria per slice: `tsc --noEmit` clean, tests green, app behavior unchanged — **including that existing on-device IndexedDB edits still load** (the phone holds live trip-planning edits; the `EditRecord` schema must not change shape). Before merging anything that touches `editStore`, use the app's Export POI data button as a backup of current edits. (Verified July 2026: all bundled `googleMapsUrl` values are already `https:`, so the F2 scheme check passes existing data — run `npm run validate:pois` after adding it to confirm.)

**Cold-start prompt** (Session C):
> Implement Phase 4 slices 1–2 of docs/planning/2026-07-03-modernization-plan.md: set up TypeScript (strict, allowJs) and convert the data layer — poiValidation, mergePois, editStore, usePoiData — defining Poi/City/WalkingTour/EditRecord types, then scripts/validate-pois. While in poiValidation, add the https: scheme check for googleMapsUrl described under finding F2 in the plan. Do NOT convert any components — Phase 5 rebuilds them as .tsx (see D8). I'm a Python developer learning web dev, so explain the TS concepts as you go per CLAUDE.md's teaching style.

---

### Phase 5 — UX modernization: interaction restructure + Liquid Glass (two stages)

**Effort**: 3–5 days total, incremental; split across two sessions (D and E in §5)
**Branch**: `feature/glass-ui`, PoC as its own commit
**Depends on**: Phase 1 (style the final map controls once, not twice); Phase 4 data-layer slice (types exist, so new components are born `.tsx`)
**Suggested model**: **Fable 5** (or Opus 4.8) — this is design judgment: information architecture, material recipes, hierarchy, motion feel, accessibility trade-offs. Mechanical leftovers (mop-up TS conversions) can drop to Sonnet 5.

**Stage 5a — Interaction restructure (design first, per D8)**:
1. Wireframe the Apple-Maps-shape layout: bottom-anchored glass control bar = search field + grouped Tours (badge) / Add Place buttons + ⋯ More menu
2. Export POI data relocates from the city list to the ⋯ menu (badge moves with it)
3. City selection moves into the expanded search sheet as a chip row/section; top-left pill removed or reduced to a passive label
4. Map chrome: hide zoom/compass on touch, single glass geolocate button; keep zoom on desktop
5. Record any deviations from D8 in this plan before building

**Stage 5b — Build in glass, surface by surface**:
1. **PoC = the bottom control bar** as the first glass component (`.tsx`): design tokens (CSS custom properties from `theme.js`), `glass` material class, HIG-style grouped buttons, ⋯ menu with Export → **hard stop: judge on iPhone before continuing** (old controls stay rendered alongside for comparison)
2. Expanded search sheet (city chips + POI results); wire up city switching and search
3. Remaining surfaces: POI popup card, tour/editor sheets with grab handles, GuideViewer large-title sheet; **delete** `CityNavigation` dropdown and both stacked `FloatingActionButton`s; extract remaining inline styles to CSS modules
4. `motion` library springs for sheets/popups; `-apple-system` font stack; consider Positron map style; safe-area audit
5. Accessibility: contrast on all glass surfaces, `prefers-reduced-transparency` opaque fallback, `prefers-reduced-motion`
6. Mop-up TS conversion of surviving components; optional follow-on: dark mode via `prefers-color-scheme`

Constraints (from D4/D8): frosted glass only — no Chrome-only SVG refraction; glass restricted to floating surfaces over the map; no text on near-transparent fills; new/rewritten components in TypeScript.

Success criteria: PoC approved on-device; controls consolidated to **two surfaces** (bottom bar + geolocate); Export reachable in ≤2 taps via ⋯; no inline `style={{}}` blocks left except genuinely dynamic values; 60fps sheet interactions on iPhone; passes reduced-transparency/motion checks.

**Cold-start prompt (Session D — 5a + PoC)**:
> Implement Phase 5 stage 5a and the PoC from docs/planning/2026-07-03-modernization-plan.md (decisions D4 and D8): create the design-token CSS and glass material class, then build the new bottom-anchored glass control bar as a TypeScript component — search field, grouped Tours/Add-Place buttons per iOS 26 HIG grouping, and a ⋯ More menu containing Export POI data with the pending-edits badge. Do not delete the old controls yet; render the new bar alongside them so I can compare. Frosted glass only (backdrop-filter blur+saturate, Safari-compatible), no SVG refraction, prefers-reduced-transparency fallback. Stop after the PoC so I can judge it on my iPhone.

**Cold-start prompt (Session E — 5b completion)**:
> Complete Phase 5 stage 5b from docs/planning/2026-07-03-modernization-plan.md; the PoC bottom bar is approved and merged. Build the expanded search sheet with city chips, move city selection and export fully into the new surfaces, delete CityNavigation and both FloatingActionButtons, restyle the POI popup, bottom sheets, and GuideViewer in the glass system, hide zoom/compass on touch devices, and add motion springs. New or rewritten components in TypeScript; convert surviving components as a final mop-up. Finish by verifying every item in the phase's success criteria and give me the on-device checklist.

---

### Phase 6 — Banff + PMTiles (post-trip)

**Effort**: ~2–4 days engineering + POI/content research (separate)
**Branch**: `feature/banff-pmtiles`
**Depends on**: Phase 1 (MapLibre is the prerequisite for `pmtiles://`)
**Suggested model**: **Fable 5** — new architecture (OPFS storage layer, download UX, extract pipeline, dual tile sources) with real design decisions.

Steps:
1. Build a Banff-region extract (`pmtiles extract` from Protomaps' free planet builds; Banff–Canmore–Lake Louise–Icefields bbox); host on Cloudflare R2 free tier
2. Add the `pmtiles` protocol plugin + OPFS storage (see `@makina-corpus/maplibre-offline-pmtiles` as reference or dependency); bundle fonts/sprites locally
3. "Download Banff maps (~size)" UI with progress, stored-state indicator, and delete option
4. Keep OpenFreeMap runtime caching as the default for all other cities (dual-source coexistence)
5. Add Banff as a data-only city entry in `pois.json` (D7); POI content comes from a separate research effort
6. Evaluate optional terrain layer (DEM hillshade) — separate decision, don't block on it
7. Verify: airplane mode with the region downloaded = complete map at all zooms across the whole bbox

Success criteria: a fresh user on a new device can download the region once and get a complete offline Banff map with zero priming; Europe cities unaffected.

**Cold-start prompt**:
> Implement Phase 6 of docs/planning/2026-07-03-modernization-plan.md: add PMTiles-based guaranteed offline for a Banff regional extract, per decision D3. Start by proposing the exact bbox for the Banff–Canmore–Lake Louise–Icefields extract and the hosting setup on Cloudflare R2, then build the pmtiles:// protocol + OPFS download layer with a download-management UI, keeping OpenFreeMap runtime caching as the default for the Europe cities. Walk me through the extract pipeline commands since I'll need to rerun them for data updates.

---

## 5. Session Execution Map

Phases define *scope*; sessions define *execution*. Each session is a **fresh Claude Code context** started by pasting the phase's cold-start prompt, working on a clean `main` (previous session merged first — every cold start re-reads this plan plus current code, so stale context never carries over). Grouping is by **file-cluster conflict analysis**: phases that edit the same files share a session or are strictly ordered.

| Session | Scope | Model | Primary files touched | Gate before merge |
|---|---|---|---|---|
| **A** | Phase 1 (MapLibre) | Sonnet 5 | `package.json`, `Map.jsx`, `vite.config.js`, `App.css`, `index.css`, `.env`, `CLAUDE.md` | Build green + **on-device airplane-mode-across-restart test** + installed-PWA update path |
| **B** | Phase 3, then Phase 2 | Sonnet 5 | `package.json`, `vite.config.js`, `ci.yml`, new `tests/`, `GuideViewer.jsx`, `public/_headers` | Lint + tests + build green; CSP verified on Netlify deploy preview |
| **C** | Phase 4, data layer only | Sonnet 5 | `tsconfig.json`, `src/data/*`, `usePoiData`, `scripts/validate-pois` | `tsc --noEmit` clean + tests green |
| **D** | Phase 5a + PoC | **Fable 5** | New: tokens CSS, glass CSS, `BottomBar.tsx` (old controls untouched) | **User judges PoC on iPhone — hard stop** |
| **E** | Phase 5b completion | **Fable 5** | All of `src/components/` + CSS; deletes `CityNavigation`, `FloatingActionButton` | Phase 5 success criteria; on-device pass |
| **F** | Phase 6 (post-trip) | **Fable 5** | New offline module, `Map.jsx`, `vite.config.js`, `pois.json`, R2 hosting | Fresh-device full-region offline test |

**Why grouped this way**:
- **A stands alone**: single revertable commit; every later session depends on it (CSP domains, SW cache pattern, control styling).
- **B combines Phases 3+2**: both edit `GuideViewer.jsx` (the `markdown-to-jsx/react` import change and the `disableParsingRawHTML` option touch the same code) — one session, deps first so hardening edits the final import shape. Two commits so either concern can be reverted alone.
- **C deliberately excludes components** (D8): Sessions D/E rewrite or delete most of them; converting first is throwaway work.
- **A → B → C ordering is hard** (shared `package.json`/`vite.config.js`); **C → D matters** (types exist so new components are born `.tsx`).
- **D/E are not parallelizable**: every glass surface shares the token/material CSS and one design voice — splitting across parallel agents trades coherence for merge conflicts.

**Subagent policy** (orchestration reality check): these phases are file-cluster-sequential by design, so the agentic wins come from **session isolation, model fit, and verification gates — not parallelism**. Sanctioned subagent uses:
1. **Explore agents** for read-only research fan-outs at the start of a session (never for editing).
2. **`/code-review`** at the end of every session, before the merge gate.
3. Optionally in Session B: one **worktree-isolated agent** writes the Vitest tests (all-new files, zero conflict) while the main thread does the dependency upgrades.

Parallel *editing* agents on shared component/CSS files are explicitly out of scope.

**Orchestration session (conductor/worker split)**:

One long-lived **Fable 5 session acts as orchestrator**; Sessions A–F are **worker sessions**. Division of labor:

- **Orchestrator** (advisory + editorial only): verifies repo state directly (`git log`, CI, plan status marks) rather than trusting pasted summaries; judges gate results against each phase's success criteria and issues a verdict — merge / fix (as a follow-up worker prompt) / rollback (to the `pre-<session>-stable` tag); tells the user when to close a worker session and which model to open the next one with, supplying the exact cold-start prompt (from this plan, adjusted for anything learned); is the **only session that edits this plan** — status marks, the Session Log, and decision amendments — and commits those doc-only changes. It never edits application code; needed fixes become instructions for a worker session.
- **Workers** (implementation only): execute one session's scope on its branch, run the objective gates (lint/test/build/`tsc`, `/code-review`), and **end by printing a Session Report** for the user to paste into the orchestrator.

**Session Report format** (every worker session ends with this):
1. Session letter + phase(s); branch and commit SHAs
2. Gate results — each success criterion: pass / fail / pending-on-device
3. Deviations from the plan, with reasons
4. Open issues or follow-ups discovered
5. On-device checklist for the user (exact steps, expected results)

**Session Log** (orchestrator-maintained; newest first):
- **2026-07-04 — Session B (Phase 3 + Phase 2) — merged.** PR #2 → `aaefea3` on main; commits `bac276f`+`69e108b` (Phase 3) and `deb7b11`+`83e1993` (Phase 2), revertable per concern; worker model Sonnet 5; rollback tag `pre-B-stable` = `92a6db4` (created retroactively — merge happened before the tag). Gates: lint 0 errors / 32 tests / build with SW + 28 precache entries, all re-verified independently by the orchestrator; CSP re-read and scoped correctly (`style-src 'self'` — GuideViewer's inline `<style>` extracted to CSS, tighter than the plan's draft). *Gate deviation, resolved*: user merged before the Netlify deploy-preview CSP check ran; the checklist moved to production instead and **passed 2026-07-04** — orchestrator confirmed via `curl` that production serves the full CSP + nosniff + Referrer-Policy headers, and the user verified map/tiles/photos/popups/worker function normally on the live site. *Deviations*: `react-hooks/set-state-in-effect` (new in plugin v7) downgraded to warning for only the 3 pre-existing violator files (Map.jsx, BottomSheet.jsx, PoiEditorSheet.jsx — Phase 5 owns them); `process-photos.js` got an export + `realpathSync` main-module guard for testability. *Accepted risk*: /code-review completed 3 of 5 agents (rate limit); rerun available on PR #2 if wanted. *Watch item*: pre-existing >500 kB chunk warning (React + maplibre-gl), not actioned.
- **2026-07-04 — Session A (Phase 1, MapLibre) — merged.** PR #1 → `21a6940` on main; migration commit `2e46422` (single commit as planned); worker model Sonnet 5; rollback tag `pre-A-stable` = `9e8a43d`. Gates: lint/build green (orchestrator re-verified independently), no `api.mapbox.com` in bundle, OpenFreeMap CacheFirst rule confirmed in generated `sw.js`, full on-device iPhone pass (Liberty style, popup CSS, attribution, geolocate, airplane-mode-across-restart). *Deviation*: the one-time `mapbox-cache` cleanup lives in `src/main.jsx`, not `vite.config.js` — Workbox generateSW has no declarative way to delete a foreign cache. *Watch item*: the single CacheFirst rule also pins OpenFreeMap's `/planet` TileJSON (daily-rotating snapshot path) for up to 30 days; if stale-tile 404s appear while online, add a `StaleWhileRevalidate` rule for the style/TileJSON paths (Phase 2 candidate). *Follow-ups resolved 2026-07-04*: `VITE_MAPBOX_TOKEN` removed from Netlify env vars; Mapbox account teardown done (tokens/billing exposure removed) — the Phase 1 post-merge reminder is discharged. *Still open*: verify installed-PWA update path on production (open the home-screen app twice; offline still works; `mapbox-cache` gone).

**Orchestrator cold-start prompt**:
> You are the orchestration session for docs/planning/2026-07-03-modernization-plan.md — read it fully; §5's orchestration rules define your role. You advise and edit the plan only; you never write application code. Each turn: verify actual repo state (git log, plan status marks, CI) before trusting anything I paste. When I give you a worker's Session Report or an on-device gate result, judge it against that phase's success criteria and lead with a verdict — merge, fix (give me the exact follow-up prompt for a worker session), or rollback (name the tag). Tell me when to close the current worker session, which model to open the next one with, and give me its exact cold-start prompt. After each merged session, update the plan's status marks and Session Log and commit that doc-only change. Keep replies short: verdict first, reasoning second. Start by reading the plan and current git state, then tell me whether we're ready to begin Session A and give me its prompt.

**Risk management (the app is a live trip tool)**:
- The production PWA is in active use for August trip planning, and `main` auto-deploys. Before each risky merge (Sessions A, B, E), tag the last verified-good commit (`pre-<session>-stable`) so Netlify rollback has a named target.
- **Pre-trip merge freeze**: no merges to `main` in the final ~2 weeks before departure except verified fixes. Sessions A–C are expected to land well before the freeze. **Sessions D/E (the UX rebuild) are post-trip by default** — they only land pre-trip if fully complete and on-device-verified before the freeze; a half-finished IA rebuild is worse for the trip than the current UI. Set the actual freeze date once travel dates are fixed.
- Before merging anything that touches `editStore` or the edit overlay (Sessions C, E), back up on-device edits via Export POI data.
- **Status tracking**: when a session completes, mark its phase heading with `✅ (merged YYYY-MM-DD)` so every cold start can see progress without asking.

---

## 6. Out of Scope / Explicitly Not Doing

- **Framework migration** (Next.js/Remix/SvelteKit) — rejected, see D1.
- **Staying on Mapbox for the shared-app future** — rejected, see D2/D3 (billing scales with users, ToS friction with offline caching, no PMTiles path).
- **Standalone fix for F2** (`javascript:` URLs) — React 19 already blocks them; folded into Phase 4 as data-quality validation.
- **Chrome-only refraction effects** — primary platform is Safari.
- **Tailwind/shadcn adoption** — plain CSS modules + tokens chosen at this scale; revisit if the component count grows.
- **PMTiles for the Europe cities** — runtime caching is the right fit for the personal, city-hopping use case.
- **Parallel multi-agent editing** of shared component/CSS files — see the subagent policy in §5; sequential sessions with fresh context beat conflicted parallelism here.
- **Separate task for the interaction restructure** — merged into Phase 5 per D8 (restyling the old layout would cement the wrong structure).
