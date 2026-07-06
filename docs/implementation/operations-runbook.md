# Operations Runbook

How to deploy, roll back, and verify Waypoints Europe safely, plus the current watch items. This is the "keep the live trip tool working" reference — for the design system see `docs/architecture/design-system.md`; for the modernization history and full decision rationale see `docs/planning/2026-07-03-modernization-plan.md`.

**Context that shapes everything below**: the production app is in active use for August 2026 trip planning, and `main` auto-deploys to Netlify on every push. There is no staging environment and, currently, no working deploy-preview flow (see "Deploy previews" below) — production is the real test surface, which is why the tag-before-merge discipline exists.

## Deploy

- **Host**: Netlify, auto-deploying from GitHub. Public URL: `https://waypoints-europe.netlify.app/`
- **Trigger**: every push to `main` builds and deploys automatically. There are no redirect rules to maintain (single-route SPA).
- **Node version**: pinned to `22` via `.nvmrc` at the repo root — keep local, CI (`.github/workflows/ci.yml`), and the Netlify build image on the same major version. If you bump Node, update `.nvmrc` first and confirm CI still passes before relying on the new version anywhere else.
- **Build command**: `npm run build`, which runs `npm run validate:pois` first via the `prebuild` script — a POI data error fails the build instead of shipping broken data.

## Rollback

Two independent safety nets exist; use whichever matches the situation.

### 1. Git tags: `pre-<session>-stable`

Before merging anything risky (a UX rebuild, a dependency major, anything touching `editStore`), tag the last known-good commit on `main`:

```bash
git tag pre-my-change-stable <commit-sha>
```

Existing tags in this repo (`git tag -l`): `pre-A-stable`, `pre-B-stable`, `pre-E-stable`, `pre-session-a-stable` — one per risky session in the July 2026 modernization. If a merge goes bad, `git revert` back to the tagged commit (works even months later) rather than force-pushing or hard-resetting `main`.

### 2. Netlify deploy restore

Independent of git history: Netlify keeps every past deploy. From the site's **Deploys** tab in the Netlify dashboard, find the last good deploy and use **"Publish deploy"** (sometimes labeled "Restore this deploy") to make it live again immediately — this re-points the live URL at a previously-built artifact without waiting for a new build. This is the faster lever for an active incident; follow up with the git-level fix (revert to the `pre-*-stable` tag) so the next push doesn't reintroduce the same bug.

### Deploy previews

**Currently disabled for this site** (dashboard only builds production deploys from `main`) — a known gap since PR #2 (Session B, 2026-07-04). The modernization plan's original workflow assumed a CSP/feature check on a `deploy-preview-*--*.netlify.app` URL before merging; in practice, every session since has verified on production instead, with a `pre-*-stable` tag as the safety net. **Watch item**: re-enable deploy previews in the Netlify dashboard before the next risky session (Phase 6 / Banff) so pre-merge verification doesn't depend entirely on production-as-test-surface.

## CI gates

`.github/workflows/ci.yml` runs on every push to `main` and every PR:

```
npm ci
npm run lint        # eslint .
npm run typecheck   # tsc --noEmit
npm test             # vitest run
npm run build        # includes prebuild's validate:pois
```

All four must pass before merging. There is no separate on-device gate in CI — offline behavior, PWA update behavior, and anything iOS-Safari-specific (the D9 `position: fixed` rule, Reduce Transparency/Motion, keyboard overlap) can only be verified on a real device; see "On-device checklist" below.

## Offline caching design

Implemented via `vite-plugin-pwa`'s Workbox `generateSW` strategy (`vite.config.js`):

- **Tiles**: `CacheFirst` for everything under `tiles.openfreemap.org` (style, vector tiles, glyphs, sprites — one rule, one domain) — cache name `openfreemap-cache`, up to 4000 entries, 30-day expiration (covers a full Europe trip without a network connection).
- **App shell + content**: Workbox's default precache (JS/CSS/HTML) is extended via `globPatterns` to also precache guides, maps, images, and JSON at build time — so a walking tour guide is available offline even if the user never opened it while online. The precache size ceiling is raised to 5 MB (`maximumFileSizeToCacheInBytes`) because the React + maplibre-gl bundle alone exceeds Workbox's 2 MB default; without this override the JS bundle would silently drop out of the precache manifest and offline app-shell loading would break.
- **Migration cleanup**: `src/main.tsx` deletes the orphaned `mapbox-cache` runtime cache left over from the July 2026 Mapbox → MapLibre migration, once, gated by a `localStorage` flag (`waypoints-mapbox-cache-cleaned`). Workbox has no declarative way to delete a cache that's no longer referenced by any route, so this has to live in app code rather than `vite.config.js`.
- **Storage durability**: `navigator.storage.persist()` is requested on load (best-effort — reduces the chance the browser evicts the offline cache under storage pressure, doesn't guarantee it).

**Known watch item**: the single `CacheFirst` rule also pins OpenFreeMap's `/planet` TileJSON (a daily-rotating snapshot path) for up to 30 days. If stale-tile 404s ever appear while online, the fix is a separate `StaleWhileRevalidate` rule for the style/TileJSON path specifically (tiles themselves are fine under `CacheFirst` — it's only the manifest-like TileJSON that rotates).

## PWA update path

`registerType: 'autoUpdate'` means a new service worker installs and activates automatically in the background — no user-facing "update available" prompt. The practical effect: a build shipped to `main` doesn't reach an already-installed home-screen app until that app is reopened (the new SW activates and takes control), and depending on timing, it can take **two** app opens (one to fetch and install the new SW, one for it to take control) before the update is fully live.

**What to check after any merge that could affect offline behavior** (not just Phase 1's original MapLibre migration — this applies to every deploy):
1. Open the installed home-screen app (not a browser tab) once, then close it.
2. Open it again — this is the "does the update actually land on the real installed PWA" check, not just a fresh install.
3. Turn on airplane mode, relaunch the app, confirm the map, POI popups, walking tours, and previously-viewed city tiles all still work.
4. Confirm `mapbox-cache` is gone from DevTools' Application → Cache Storage (only relevant on devices that had the app installed before the MapLibre migration).

**Still open** (per the modernization plan's session log): the full installed-PWA update-path check on production has not been independently re-confirmed since the Phase 5 UX rebuild landed (Session E, 2026-07-05) — do this before the pre-trip merge freeze (2026-08-14) if there's any doubt.

## On-device edit backup/restore flow (Export POI data)

**What it is**: in-app POI edits (create/edit/delete, made via `PoiEditorSheet.tsx`) are stored on-device in IndexedDB (`src/data/editStore.ts`) and merged with the bundled `src/data/pois.json` at load time (`mergePois.ts`, via `usePoiData.ts`). They are **not** synced anywhere automatically.

**Export**: the BottomBar's **⋯ More menu → Export POI data** (badge shows the pending-edit count) calls `exportMergedPois()` in `src/data/exportPois.js`, which serializes the *merged* data (bundled + on-device edits) as `pois-YYYY-MM-DD.json`. On iOS, `navigator.share` opens the share sheet — from there, AirDrop it to another device or save to Files. Where Web Share isn't available (most desktop browsers), it falls back to a plain file download.

**There is no in-app import** — Export is one-directional (device → file). "Restore" therefore means one of:
- **Safety backup before risky work**: export before merging any change that touches `editStore` or the edit-merge logic, so that if a bug corrupts or drops on-device edits, you have the pre-change JSON to manually re-enter the affected POIs.
- **Folding edits back into the repo** (typically post-trip): the exported file is already a drop-in replacement for `src/data/pois.json` — copy it over, run `npm run validate:pois`, commit. This is how on-device trip-planning edits become the new baseline for everyone.

**Before merging anything that touches `editStore` or the edit overlay**: export first. This has been the standing rule since Sessions C and E (both touched this code) and applies to any future session that does too.

## Watch items (current, as of 2026-07-05)

Pulled from the modernization plan's session log — check `docs/planning/2026-07-03-modernization-plan.md` for full context before acting on any of these:

- **Deploy previews disabled** — see "Deploy previews" above.
- **Installed-PWA update path** on the post-Phase-5 production build not independently re-verified — see "PWA update path" above.
- **iOS Reduce Transparency / Reduce Motion toggles**: verified via Chromium DevTools emulation only; the real iOS Settings toggles are still an open on-device spot-check.
- **Edit-export sanity check**: confirm Export still produces a correct merged file after the Phase 5 rewrite (no functional change was intended, but the surrounding components were rewritten).
- **`>500 kB` chunk size warning** at build time (React + maplibre-gl; `motion` adds ~35 kB gzipped on top) — pre-existing, not yet actioned. Only worth addressing if build performance or initial load time becomes a real complaint.
- **Three separate sheet shells** (`BottomSheet.tsx`, plus `GuideViewer.tsx` and `PoiEditorSheet.tsx` each implementing their own dismiss/backdrop/scroll-lock logic) — a known duplication, deliberately deferred as a structural refactor rather than rushed into the Phase 5 review gate.
- **`ITINERARY_ORDER`** (the city ordering list) lives in `SearchSheet.tsx` rather than in `pois.json` — relevant if/when the Amsterdam/Paris handoff (`docs/implementation/city-data-contract.md`) adds cities and expects `pois.json` to be the single ordering source.
- **Zoom/compass touch-hiding** uses a `:has()` CSS selector keyed to MapLibre's internal control class names — works today, but is coupled to MapLibre's DOM structure rather than a first-class API. A cleaner fix would conditionally skip `addControl` based on a coarse-pointer media query instead.
- **Duplicate text-normalization**: `normalizeSearchText` (search) and `mergePois`'s slug-folding logic independently implement the same string-normalization transform. Not a bug, just a copy that could be unified.
- **Phase 6 (Banff + PMTiles)** has not started — it's explicitly post-trip. It depends on this Phase 1 MapLibre migration (PMTiles needs the `pmtiles://` protocol) and must follow the D9 `position: fixed` rule for its download-management UI from the start.
- **Pre-trip merge freeze**: no merges to `main` after **2026-08-14** except verified fixes (departure ~end of August 2026).
