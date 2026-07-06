# Technical Architecture

This document details the technical implementation of Waypoints Europe.

**For the design/material system (glass, tokens, z-order, motion), see [`design-system.md`](./design-system.md). For deploy/rollback, CI gates, and offline-cache operations, see [`../implementation/operations-runbook.md`](../implementation/operations-runbook.md).**

## Technology Stack

### Core Technologies
- **Frontend Framework**: React 19.x
- **Build Tool**: Vite 8.x (Rolldown for production; ESBuild for dev)
- **Language**: TypeScript (strict mode), incrementally adopted — data layer, hooks, and all components are `.ts`/`.tsx`
- **PWA Plugin**: vite-plugin-pwa 1.x (Workbox-based service worker)
- **Mapping Library**: MapLibre GL JS 5.x with OpenFreeMap Liberty tiles (keyless, no billing, no account)
- **Lightbox**: Yet Another React Lightbox (YARL) 3.25.x
- **Markdown Renderer**: markdown-to-jsx 9.x (imported from `markdown-to-jsx/react`)
- **Motion**: `motion` (Framer Motion's successor) for sheet/popover spring animations
- **Test Runner**: Vitest
- **Linting**: ESLint 10 (flat config) + typescript-eslint

### Development Environment
- **Node.js**: 22 (pinned via `.nvmrc`; required by Vite 8)
- **Package Manager**: npm 8.x or higher
- **Version Control**: Git

## Project Structure

```
waypoints-europe/
├── public/
│   ├── manifest.json          # PWA configuration
│   ├── _headers               # Netlify CSP + security headers
│   ├── guides/                # Walking tour markdown guides
│   ├── maps/                  # Walking tour map images
│   └── images/                # POI photos
├── src/
│   ├── components/
│   │   ├── Map.tsx                     # Main map component (MapLibre)
│   │   ├── BottomBar.tsx               # Bottom-anchored glass control bar (search, Tours, Add Place, ⋯ menu)
│   │   ├── SearchSheet.tsx             # Expanded search sheet (city chips + POI search)
│   │   ├── BottomSheet.tsx             # Shared bottom-sheet primitive
│   │   ├── WalkingTourBottomSheet.tsx  # Tour details panel
│   │   ├── GuideViewer.tsx             # Markdown tour guide renderer (own full-screen sheet shell)
│   │   ├── PoiEditorSheet.tsx          # In-app POI create/edit form (own sheet shell, no grab handle)
│   │   ├── POIPopup.tsx                # POI popup content (glass card)
│   │   ├── ImageLightbox.tsx           # Full-screen image viewer (YARL wrapper)
│   │   ├── ErrorBoundary.tsx           # Top-level error boundary
│   │   └── icons.tsx                   # Shared SVG line icons (no emoji controls)
│   ├── data/
│   │   ├── pois.json          # POI data + walking tour definitions
│   │   ├── types.ts           # Poi / City / WalkingTour / EditRecord types
│   │   ├── poiValidation.ts   # Shape/enum/URL-scheme validation
│   │   ├── mergePois.ts       # Merges bundled pois.json with on-device edits
│   │   ├── editStore.ts       # IndexedDB persistence for in-app edits
│   │   └── exportPois.js      # Web Share / download export of merged POI data
│   ├── hooks/
│   │   ├── usePoiData.ts      # Loads + merges POI data, exposes edit actions
│   │   └── useSheetDismiss.ts # Shared ESC/backdrop/scroll-lock dismiss logic
│   ├── styles/
│   │   ├── tokens.css         # Design tokens (colors, glass material, z-index ladder)
│   │   └── glass.css          # Frosted-glass material classes
│   ├── config/
│   │   └── motion.ts          # Shared spring presets for the `motion` library
│   └── App.tsx                 # Main application (wraps tree in MotionConfig)
├── scripts/
│   ├── validate-pois.ts        # `npm run validate:pois` — runs as `prebuild`
│   └── process-photos.js       # Photo pipeline (EXIF/GPS strip, resize)
├── tests/                      # Vitest unit tests (pure logic: validation, merge, photo script)
├── docs/                       # Developer documentation
└── package.json
```

## Core Components

### Design Tokens & Glass Material
- **Files**: `src/styles/tokens.css`, `src/styles/glass.css`
- Replaces the retired `src/config/theme.js`. See [`design-system.md`](./design-system.md) for the full token/material reference.

### Map Component
- **File**: `src/components/Map.tsx`
- **Features**:
  - MapLibre GL JS integration with OpenFreeMap Liberty style
  - POI markers with clustering
  - Popup rendering with rich content
  - Walking tour route visualization
  - Geolocation tracking; zoom/compass hidden on touch (pinch/rotate gestures cover them), kept on desktop
- **Coordinate Format**: `[longitude, latitude]` (MapLibre GL JS standard, inherited from Mapbox GL v1)

### Bottom Control Bar & Search
- **Files**: `src/components/BottomBar.tsx`, `src/components/SearchSheet.tsx`
- Consolidates what used to be four separate control clusters (top-left city dropdown, top-right search, two stacked FABs) into one bottom-anchored glass bar plus an expanded full-screen search sheet — the Apple Maps IA pattern (`docs/planning/2026-07-03-modernization-plan.md`, decision D8).
- **BottomBar**: search field, grouped Tours (badge)/Add Place buttons, and a **⋯ More menu** containing **Export POI data** (with the pending-edits badge) and the build stamp.
- **SearchSheet**: full-screen takeover; city chip row/section for city switching (selection persisted to `localStorage`) plus POI search results. Opaque, not glass — see [`design-system.md`](./design-system.md) for why large/text-dense surfaces don't get `backdrop-filter`.
- The old `CityNavigation` dropdown and both `FloatingActionButton`s were deleted once this consolidation shipped (Phase 5, Session E).

### Walking Tour System
**Components:**
1. **BottomBar.tsx** — Tours button (badge shows tour count) opens the tour sheet
2. **WalkingTourBottomSheet.tsx** — Tour details with map preview, uses the shared `BottomSheet` shell
3. **GuideViewer.tsx** — Full-screen markdown renderer, own sheet shell with a grab handle

**Data Flow:**
- Tours defined in `pois.json` → `walkingTours` section
- Tour metadata includes: name, description, difficulty, time, distance
- POI sequence links tour stops to POI data

### In-App POI Editing
- **File**: `src/components/PoiEditorSheet.tsx`
- Create/edit/delete POIs on-device; own sheet shell (no grab handle, by design — a handle invites casual dismissal of a half-typed draft, so the only way out is the explicit Cancel button)
- Edits persist to IndexedDB via `src/data/editStore.ts` and are merged over the bundled `pois.json` at load time (`mergePois.ts` / `usePoiData.ts`)
- **Export POI data** (in the BottomBar's ⋯ menu) produces a merged `pois.json` via Web Share (AirDrop on iOS) or download — see the operations runbook for the backup/restore flow

## Data Structure

### POI Object Schema
```typescript
{
  "id": "city-poi-slug",
  "name": "POI Name",
  "coordinates": [longitude, latitude],  // MapLibre format
  "category": "landmark|culture|food|practical|hotel",
  "visibility": "always|walkingTour",
  "description": "Main description",
  "walkingTourNotes": "Historical context for tours",
  "notes": "Practical tips (hours, costs, recommendations)",
  "googleMapsUrl": "https://maps.app.goo.gl/xyz",  // validated as an https: URL
  "photos": []
}
```

Canonical types (`Poi`, `City`, `WalkingTour`, `EditRecord`) live in `src/data/types.ts`.

### Walking Tour Schema
```typescript
{
  "id": "tour-id",
  "name": "Tour Display Name",
  "description": "One-sentence summary",
  "difficulty": "easy|moderate|challenging",
  "estimatedTime": "X hours",
  "distance": "~X km",
  "mapImage": "/maps/tour-id.jpg",
  "poiSequence": ["city-poi-1", "city-poi-2", "..."]
}
```

## Image Lightbox Implementation

### Library: Yet Another React Lightbox (YARL)
- **Version**: 3.25.x
- **License**: MIT (free for personal/commercial use)
- **Bundle Size**: ~20-30 KB gzipped with zoom plugin
- **Security**: Zero dependencies, no known vulnerabilities

### Key Features
- ✅ Professional mobile touch support (pinch-to-zoom, double-tap, swipe)
- ✅ Prevents background scroll (built-in NoScroll module)
- ✅ Plugin architecture (zoom functionality via optional plugin)
- ✅ TypeScript built-in
- ✅ React 19 compatible

### Usage
- Thumbnail preview in `WalkingTourBottomSheet.tsx`
- Full-screen lightbox with zoom on tap

## Guide Viewer Implementation

### Library: markdown-to-jsx
- **Version**: 9.x, imported from `markdown-to-jsx/react`
- **License**: MIT
- **Options**: `disableParsingRawHTML: true` — all bundled guide files verified to contain zero `<` characters, so this is zero-cost today and closes off raw-HTML injection if externally-sourced guide content (e.g. Amsterdam/Paris) is added later

### Key Features
- ✅ Custom markdown styling (matches the glass design system)
- ✅ Mobile-responsive typography
- ✅ Full-screen sheet shell with grab handle, ESC/backdrop dismiss
- ✅ Offline-ready (cached by PWA service worker)

### Integration
- Opened from `WalkingTourBottomSheet.tsx`
- Fetches markdown from `/public/guides/{tour-id}.md`

## PWA Configuration

### Service Worker
- **Plugin**: vite-plugin-pwa with Workbox (`generateSW` strategy, `registerType: 'autoUpdate'`)
- **Runtime caching**: `CacheFirst` for `tiles.openfreemap.org` (style, tiles, glyphs, sprites — all one domain, one rule), cache name `openfreemap-cache`, 30-day expiration, up to 4000 entries
- **Precache**: everything Workbox's default globs pick up (JS/CSS/HTML) plus guides/maps/images/JSON via an extended `globPatterns` list, so tour content is available offline without ever having been visited
- **Precache size limit**: raised to 5 MB (`maximumFileSizeToCacheInBytes`) — the JS bundle (React + maplibre-gl) exceeds Workbox's 2 MB default
- **One-time migration cleanup**: `src/main.tsx` deletes the orphaned `mapbox-cache` runtime cache left behind by the July 2026 MapLibre migration (Workbox has no declarative way to delete a foreign cache, so this runs in app code, gated by a `localStorage` flag)
- **Persistent storage**: requests `navigator.storage.persist()` on load (best-effort; reduces risk of the offline cache being evicted under storage pressure)

### Web App Manifest
- **Name**: Waypoints Europe
- **Short Name**: Waypoints
- **Theme Color**: #2563eb (blue)
- **Installation**: "Add to Home Screen" on iOS/Android
- **Icons**: 192x192 / 512x512 PNG + 180x180 Apple touch icon

### Security Headers
- **File**: `public/_headers` (Netlify header syntax)
- **Content-Security-Policy**: `default-src 'self'` baseline; `connect-src`/`worker-src` allow `tiles.openfreemap.org` and `blob:` for MapLibre's tile fetching and worker-based rendering; `style-src 'self'` with no `unsafe-inline` (GuideViewer's markdown styling lives in an external `GuideViewer.css`, not an inline `<style>` tag, specifically so this doesn't need loosening)
- Also sets `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`

## MapLibre + OpenFreeMap Integration

### Configuration
- **No access token, no account, no billing** — OpenFreeMap is a keyless public tile CDN (donation-funded, no SLA; self-hostable via Protomaps if it ever falters)
- **Map Style**: `https://tiles.openfreemap.org/styles/liberty`
- **Controls**: `NavigationControl` (zoom, compass — desktop only) and `GeolocateControl` (always shown)
- **Font fix**: label layers request Noto Sans Regular/Bold from OpenFreeMap's glyph server (the original Mapbox style's "DIN Offc Pro" stack 404s there)

### Why MapLibre (not Mapbox)
Migrated July 2026 ahead of sharing the app beyond personal use — Mapbox bills per map load ($5/1,000 past the free tier) and its terms sit uneasily with 30-day client-side tile caching; MapLibre + OpenFreeMap removes both constraints and is the prerequisite for PMTiles-based regional offline packs (planned for a future Banff phase). Full rationale: `docs/planning/2026-07-03-modernization-plan.md`, decision D2.

### Features
- Custom POI markers (9px circles for mobile)
- Cluster visualization (color-coded by density); cluster-tap zoom uses MapLibre v4's Promise-based `getClusterExpansionZoom` (the old Mapbox-style callback silently no-ops)
- Popup rendering with rich content (glass card, `POIPopup.tsx`)
- Geolocation (no `showUserHeading` — that was a Mapbox-only option MapLibre never implemented)
- Zoom-responsive POI labels

## TypeScript

- **Config**: `tsconfig.json` — `strict: true`, `noUncheckedIndexedAccess`, `allowJs: true` (for any leftover `.js`), `jsx: "react-jsx"`
- **Coverage**: data layer (`poiValidation`, `mergePois`, `editStore`, `usePoiData`, `types`) converted first; all components are now `.tsx`, born that way during the Phase 5 glass rebuild rather than converted ahead of a rewrite
- **CI gate**: `npm run typecheck` (`tsc --noEmit`) runs in `.github/workflows/ci.yml` between lint and test
- For a Python developer: closest analogue is type hints + mypy, enforced at build time instead of a separate lint step

## Build & Deployment

### Development
```bash
npm run dev         # Vite dev server
```

### Production Build
```bash
npm run build       # prebuild runs validate:pois, then vite build
npm run preview     # Test production build locally
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run lint        # eslint .
```

### Deployment
- **Netlify**, auto-deploying `main` from GitHub. Public URL: `https://waypoints-europe.netlify.app/`
- Node version pinned to 22 via `.nvmrc` (Vite 8 requires Node 20.19+/22) so local, CI, and the Netlify build image agree
- See [`operations-runbook.md`](../implementation/operations-runbook.md) for the deploy/rollback procedure and CI gate details

## Browser Compatibility

### PWA Support
- **Chrome/Edge**: Full PWA support
- **Safari (iOS)**: PWA support with limitations; primary target platform for the glass design system
- **Firefox**: Full PWA support

### iOS-Specific Considerations
- Limited offline storage vs. Android (mitigated by `navigator.storage.persist()`)
- "Add to Home Screen" installation flow
- **Standalone viewport quirk (D9, found Session E)**: iOS 26 sizes a standalone PWA's document containing block to screen-minus-top-inset while the fixed-position viewport is the full screen. Every viewport-anchored surface in this app therefore uses `position: fixed`, never `position: absolute` anchored to the document — see `design-system.md` for the full rule and the failure mode it fixes
- Restricted background sync; limited push notification support (neither used by this app)

## Performance Optimizations

1. **Map Load**: Single initialization per session (`useEffect` guard on `map.current`)
2. **Caching**: Aggressive caching for offline travel use (see PWA Configuration above)
3. **Image Optimization**: Target <1 MB for map images; photo pipeline strips EXIF/GPS and resizes
4. **Bundle Size**: known watch item — the React + maplibre-gl chunk exceeds the 500 kB warning threshold (pre-existing, not yet actioned); `motion` adds ~35 kB gzipped on top
5. **Marker Rendering**: 9px circles for mobile screen efficiency

## Development Notes

- **Coordinate Format**: Always `[longitude, latitude]` in code (MapLibre standard, inherited from Mapbox)
- **Documentation Format**: `latitude, longitude` in markdown docs (human-readable) — always swap when transferring, see `CLAUDE.md`
- **Offline-First**: Service worker caches all critical resources; IndexedDB holds on-device edits
- **Mobile-First**: Touch-friendly interactions, `position: fixed` viewport-anchored layout (see D9 above)
- **No emoji control icons**: shared SVG line icons (`src/components/icons.tsx`) throughout
