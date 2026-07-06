# Technology Decisions

This document explains the technology choices made for Waypoints Europe and provides historical context for alternatives considered.

**⚠️ Superseded July 2026**: the mapping layer, dependency majors, and language choice described below as "current" reflect the stack as of late 2025. The app now runs **MapLibre GL JS + OpenFreeMap** in place of Mapbox, React 19 + Vite 8, and TypeScript across the whole codebase. See [§ 2026 Modernization](#2026-modernization-july-2026) at the end of this document for the current decisions and their rationale — the original sections are kept as-is below for historical context (why Mapbox was picked in the first place still explains a lot about the app's shape).

## Chosen Framework: PWA + React + Vite + Mapbox *(original choice, 2025 — see 2026 update below)*

### Why This Combination

- **PWA**: Cross-platform (one codebase for all devices), excellent offline support, native-like experience
- **React**: Component-based architecture, great Mapbox integration, excellent ecosystem
- **Vite**: Modern, fast build tool using ESBuild for development and Rollup for production
- **Mapbox**: Superior customization, professional styling, robust offline maps, cost-effective for POCs

## 2025 Technology Updates

### Deprecated Technologies to Avoid

- **Create React App (CRA)**: Officially deprecated by React team on February 14, 2025. No longer maintained and not recommended for new projects
- **Webpack as primary bundler**: While not deprecated, slower compared to modern alternatives
- **Manual service worker setup**: Modern PWA plugins handle this automatically

### Current Best Practices (2025)

- **Vite**: Lightning-fast dev server startup and HMR using ESBuild for development and Rollup for production
- **vite-plugin-pwa**: Zero-config PWA plugin with built-in service worker generation, offline support via Workbox, and React support
- **Modern bundlers**: Vite provides optimal speed and performance for modern web development

## Alternatives Considered

### Mapbox (Superseded July 2026)
- **What changed**: replaced by MapLibre GL JS + OpenFreeMap tiles. Full rationale in [§ 2026 Modernization](#2026-modernization-july-2026) below and `docs/planning/2026-07-03-modernization-plan.md` decision D2
- **Why it isn't a reversal of the analysis below**: the OSM+Leaflet rejection (steeper styling learning curve, slower vector-tile performance) doesn't apply to MapLibre — it's a fork of Mapbox GL v1 (2020), same API surface, same vector-tile performance, just without the token/billing/ToS constraints

### Google Maps (Rejected)
- **Reasons**: More expensive, less customization, vendor lock-in
- **Cost**: 2x more expensive than Mapbox for similar features
- **Customization**: Limited map styling options
- **Decision**: Mapbox offers better value for POC and personal projects

### OpenStreetMap + Leaflet (Rejected)
- **Reasons**: Too complex for professional styling, more development overhead
- **Learning Curve**: Steeper learning curve for custom styling
- **Performance**: Slower than vector tiles for mobile devices
- **Decision**: Mapbox provides professional results with less effort

### Electron (Rejected)
- **Reasons**: Desktop-only, no mobile support, massive file sizes
- **Target Devices**: Need iPhone/iPad support for travel
- **Bundle Size**: 100+ MB vs. <5 MB for PWA
- **Decision**: PWA provides cross-platform support with smaller footprint

### React Native (Rejected)
- **Reasons**: More complex setup, unnecessary for this use case
- **Development**: Requires separate iOS/Android builds
- **App Store**: Requires app store distribution vs. instant PWA install
- **Decision**: PWA meets all requirements without native app complexity

## Key Research Insights

### PWA Market Position (2025)

- All major browsers support PWA technologies
- Industry leaders like Starbucks, Trivago showing significant engagement improvements
- Service workers and web app manifests are mature, stable technologies
- Cross-platform compatibility superior to native app development for most use cases

### Mapbox vs Competitors

- 50% cost savings compared to Google Maps for similar functionality
- Better customization and styling options than OpenStreetMap solutions
- Robust offline capabilities specifically designed for travel applications
- Vector tiles provide superior performance and visual quality

### Mobile Travel App Requirements

- Offline-first architecture essential for international travel
- PWA installation provides native-like experience without app store friction
- Service workers enable reliable caching of maps, images, and data
- Progressive enhancement ensures functionality across all device capabilities

## Mapbox API Usage & Cost Management *(historical — Mapbox is no longer used; kept for context on why cost was a driver of the 2026 MapLibre switch)*

### Free Tier Limits (2025)

- **50,000 map loads per month** - Each time the map initializes counts as one load
- **Free geocoding**: 100,000 requests per month
- **Free directions**: 100,000 requests per month
- **Overage charges**: Apply after free limits exceeded

### Cost-Conscious Development Practices

**Map Load Optimization:**
```javascript
// Prevent unnecessary map reloads
useEffect(() => {
  if (map.current) return // Prevent duplicate initialization
  // Initialize map only once
}, [])
```

**Development vs Production Tokens:**
```env
# Use different tokens for development and production
VITE_MAPBOX_TOKEN_DEV=pk.your_dev_token_here
VITE_MAPBOX_TOKEN_PROD=pk.your_production_token_here
```

**Efficient Caching:**
```javascript
// Cache map tiles for offline use and reduced API calls
workbox: {
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.mapbox\.com/,
      handler: 'CacheFirst', // Serves from cache when available
      options: {
        cacheName: 'mapbox-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    }
  ]
}
```

### Budget Monitoring Checklist

- [ ] Set up Mapbox usage alerts at 80% of free tier
- [ ] Monitor usage weekly during development
- [ ] Use caching strategies to minimize API calls
- [ ] Test with minimal map loads during development
- [ ] Pre-download map tiles for travel areas before trip

## Future Expansion Opportunities

- **Content Management**: Add ability to edit POIs during travel — ✅ shipped July 2026, see [§ 2026 Modernization](#2026-modernization-july-2026)
- **Social Features**: Share POIs with other travelers
- **Route Planning**: Connect POIs with walking routes
- **Categories**: Filter POIs by type (food, sights, shopping)
- **Desktop Version**: Easy migration to Electron if needed (codebase already compatible)

---

## 2026 Modernization (July 2026)

Full write-up, stress-test verdicts, and session-by-session execution are in `docs/planning/2026-07-03-modernization-plan.md`. This section is the durable summary — what changed and why — for anyone who doesn't need the planning history.

### Mapping: Mapbox → MapLibre GL JS + OpenFreeMap (D2)

Driven by the plan to share the app beyond personal use: Mapbox bills per map load ($5/1,000 past the 50k/month free tier) — a cost that scales with the app's success — and its terms sit uneasily with the 30-day client-side tile caching this app already did for offline travel use. MapLibre GL JS (a 2020 fork of Mapbox GL v1) has an identical API surface for everything this app uses (`Map`, `Popup`, `NavigationControl`, `GeolocateControl`, clustering, `flyTo`/`fitBounds`), so the migration was a near drop-in. OpenFreeMap is a keyless, donation-funded public tile CDN — no account, no token, no usage limit, no bill. It's also the prerequisite for MapLibre's `pmtiles://` protocol, which a future Banff regional-offline phase depends on. Trade-off accepted: OpenFreeMap has no SLA (self-hostable via Protomaps if it falters).

### TypeScript: incremental, data layer first (D5)

Vite compiles TypeScript natively. Rather than a big-bang conversion, the data layer converted first (`poiValidation`, `mergePois`, `editStore`, `usePoiData`, defining `Poi`/`City`/`WalkingTour`/`EditRecord` types) since that's where type safety catches real bugs (a `.filter(Boolean)` regression that let malformed IndexedDB records leak into the merged POI list was caught this way). Components were deliberately **not** converted in that pass — the UX modernization below (D8) was already going to rewrite or delete most of them, so typing them first would have been throwaway work. They were born `.tsx` during that rebuild instead.

### Dependency majors (D6)

Vite 8 (Rollup → Rolldown), `markdown-to-jsx` 9 (import moved to `/react`, raw-HTML tags escaped by default), ESLint 10 + `typescript-eslint`, `globals` 17 — all verified safe via each project's migration notes before upgrading. Vitest added alongside, with `npm test` wired into CI.

### Security hardening (F1–F4 in the modernization plan)

A July 2026 security review found the codebase clean overall (`npm audit`: zero vulnerabilities; no `innerHTML`/`eval` sinks; photo pipeline already strips EXIF/GPS). Two items were actioned: `disableParsingRawHTML: true` on the markdown renderer (cheap now, matters once externally-sourced guide content exists), and a `public/_headers` Content-Security-Policy + security headers for Netlify (previously relying entirely on Netlify's defaults). A third finding (`googleMapsUrl` accepting non-`https:` schemes) was folded into the TypeScript data-layer conversion as a validation rule rather than a standalone task, since React 19 already blocks `javascript:` hrefs at render time regardless.

### UX modernization: styling-layer pass, not a rebuild (D1, D4, D8)

Evaluated and rejected a framework migration (Next.js/Remix/SvelteKit) — none of their value (SSR, routing, server data) applies to a no-backend, offline-first, single-route static PWA, and a meta-framework would fight the same offline behavior this app already has working. The dated look was diagnosed as a **styling problem** (138 inline `style={{}}` blocks, zero `backdrop-filter` usage) and an **information-architecture problem** (four differently-styled control clusters, stacked FABs — a documented 2026 anti-pattern, with the two most-used controls in the hardest one-handed reach zone). Both were fixed together: a CSS-custom-property token system + one `glass` frosted-material class (iOS 26 Liquid Glass language, Safari as the primary target), and consolidation into a single bottom-anchored control bar plus an expanded search sheet (the Apple Maps IA pattern). Full material/token/z-index reference: `docs/architecture/design-system.md`.

### Where to look for more

- **Full decision log with stress-test verdicts, session-by-session history, and open follow-ups**: `docs/planning/2026-07-03-modernization-plan.md`
- **Material system, tokens, z-order, motion conventions**: `docs/architecture/design-system.md`
- **Deploy/rollback, CI gates, offline caching, edit-backup flow**: `docs/implementation/operations-runbook.md`
