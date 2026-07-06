# Design System

The visual language for Waypoints Europe: an iOS 26 Liquid-Glass-inspired styling layer built as design tokens + one frosted-material CSS class, applied on top of the existing component skeleton (map, bottom bar, sheets, popups) rather than a framework rewrite.

Built July 2026 (Phase 5 of `docs/planning/2026-07-03-modernization-plan.md`, decisions D4/D8/D9). This document is the durable reference for working in the system day to day; the planning doc and `docs/planning/2026-07-04-session-d-notes.md` / `2026-07-05-session-e-notes.md` hold the design discussion and deviations if you need the "why we built it this way" history.

## Token architecture

**File**: `src/styles/tokens.css` — the single source of truth for color, glass material, elevation, shape, type, and z-index. It replaced `src/config/theme.js`, which is no longer imported anywhere.

CSS custom properties (`--name: value` on `:root`) are readable everywhere via `var(--name)`. The whole system leans on one trick: **components never branch on theme/accessibility state — only the token values change**, via `@media` queries redeclaring `:root`. Dark mode, reduced transparency, and reduced motion are all implemented this way; no component-level conditional rendering for any of them.

Token groups, in `tokens.css` order:

| Group | Tokens | Notes |
|---|---|---|
| Brand | `--color-primary`, `--color-danger`, `--color-accent`, `--color-success` | `--color-accent`/`--color-success` are separate from `--color-primary`/`--color-danger` because the same blue that works as a *fill* (button background) fails contrast as *text* on a near-black dark-mode surface — they diverge in dark mode, primary/danger don't |
| Text | `--text-primary`, `--text-secondary`, `--text-on-accent` | Always solid — never translucent text on glass (legibility is glassmorphism's known failure mode) |
| Separators | `--separator`, `--separator-strong` | Hairline dividers inside a glass surface vs. a stronger tone where a division must read at a glance (between grouped buttons) |
| Glass material | `--glass-fill`, `--glass-fill-elevated`, `--glass-fill-opaque`, `--glass-fill-elevated-opaque`, `--fill-well`, `--fill-well-pressed`, `--glass-blur`, `--glass-saturate`, `--glass-border`, `--glass-inner-highlight` | See "Glass material" below |
| Elevation | `--shadow-floating` | Two layered shadows (tight contact + soft ambient) read more physically than one |
| Shape | `--radius-bar`, `--radius-capsule`, `--radius-menu`, `--radius-sheet`, `--radius-card` | One radius scale, reused everywhere — no per-component radii |
| Layout | `--hit-target` (44px, iOS HIG minimum), `--bar-inset`, `--safe-bottom` (`env(safe-area-inset-bottom, 0px)`), `--bar-clearance` | `--bar-clearance` is derived from the bar's real ingredients (hit target + padding + inset), not a hardcoded guess, so anything that must clear the bar (OSM attribution, the map error banner) tracks bar changes automatically |
| Type | `--font-ui` | `-apple-system` stack — resolves to San Francisco on iOS/iPadOS |
| Z-index | `--z-bar` through `--z-error-banner` | See "Z-order ladder" below |

## Glass material

**File**: `src/styles/glass.css`

One material, two classes:
- **`.glass`** — the standard frosted material: `background-color: var(--glass-fill)` + `backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate))` (with the `-webkit-` prefix Safari needs) + a 0.5px hairline border + the two-layer floating shadow.
- **`.glass--elevated`** — same recipe, `--glass-fill-elevated` instead, for popovers/menus that float above an already-glass surface and need visual separation from it.
- **`.glass--opaque`** — same border/radius/shadow language, `background-color: var(--glass-fill-elevated-opaque)`, `backdrop-filter: none`. For surfaces too large or too text-dense to blur (see "Small-surfaces-only" below).

`backdrop-filter` blurs whatever renders *behind* the element (the live MapLibre canvas) before painting the translucent fill on top; `saturate()` re-boosts the color the blur washes out. MapLibre's own control chrome (`.maplibregl-ctrl.maplibregl-ctrl-group`) is targeted directly in the same rule — MapLibre owns that DOM so there's no way to add a class to it, but it needs the identical material and fallback behavior as everything else.

### Tint bias (user decision, 2026-07-04)

The material sits at the **tinted/frosted end** of the spectrum, not maximum transparency: fill opacity ~0.82 light / 0.80 dark, `blur(22px) saturate(1.7)`. Two reasons: the backdrop is a live, busy map (not typical app content), and Apple itself walked Liquid Glass back toward opacity for readability at WWDC June 2026 (iOS 27). If a future device or map style makes the material read as too opaque, the four `--glass-*` tokens in `tokens.css` are the only thing to touch — no component changes needed.

### Small-surfaces-only constraint

Glass is restricted to **small floating controls**: the bottom bar, the ⋯ menu, the POI popup card, MapLibre's control group. `backdrop-filter` cost scales with pixel area over a live WebGL canvas, so large surfaces cost doubly. Two surfaces were built glass and then demoted to `.glass--opaque` after review for exactly this reason:
- The bottom bar's search-results popover (up to `40dvh` — would have been the app's largest backdrop-filter surface)
- The full-screen expanded search sheet, and the other large sheets (tours, editor, guide viewer)

**Rule of thumb**: floating chrome = glass; full sheets and anything text-dense = opaque, same token/radius/shadow language, no blur.

### Accessibility fallbacks

- **No `backdrop-filter` support**: `@supports not (...)` swaps in the `-opaque` tokens.
- **`prefers-reduced-transparency: reduce`**: `tokens.css` points the live fill tokens at their opaque counterparts, and `glass.css` disables the blur under the same query (no point computing an invisible blur once the fill goes solid). Verified via CDP emulation to render fully opaque with `backdrop-filter: none`; the iOS on-device Reduce Transparency toggle is a standing spot-check, not yet confirmed on-device.
- **No Chrome-only refraction**: SVG displacement in `backdrop-filter` (true lensing) is Chrome-only and explicitly out of scope — Safari/iOS is the primary platform.

## Motion

**File**: `src/config/motion.ts` — shared spring presets for the `motion` library (Framer Motion's successor).

```ts
export const springSheet: Transition = { type: 'spring', stiffness: 420, damping: 40 };  // sheets sliding up
export const springPop: Transition   = { type: 'spring', stiffness: 550, damping: 32 };  // popovers/menus scaling in
```

Springs (not fixed-duration easing curves) keep their velocity when interrupted mid-gesture, which is what makes sheets feel grabbable. `App.tsx` wraps the whole tree in `<MotionConfig reducedMotion="user">`, which turns every spring into an instant cross-fade when `prefers-reduced-motion: reduce` is set — components never check the media query themselves.

## Z-order ladder

Defined once, in `tokens.css`, bottom-to-top. Every fixed-position surface reads its z-index from here — **never hardcode a z-index outside this list**.

```
--z-bar:              999   /* bottom control bar */
--z-sheet-backdrop:   1000  /* scrim behind a bottom sheet */
--z-sheet:            1001  /* bottom sheet content (tours) */
--z-search-sheet:     1100  /* expanded search sheet (full-screen) */
--z-editor-backdrop:  1199
--z-editor:           1200  /* POI editor sheet */
--z-picking-banner:   1300  /* "tap the map to pick a location" banner */
--z-guide-backdrop:   10000
--z-guide:            10001 /* GuideViewer, full-screen */
--z-error-banner:     10010 /* highest — carries the Reload button, must never be buried */
```

The large jump before the guide viewer (1300 → 10000) is deliberate headroom, not a mistake — it and the error banner are meant to sit unambiguously above everything else regardless of what gets inserted at the lower tiers later.

## The iOS 26 `position: fixed` rule (D9)

**Found on-device, Session E, 2026-07-05, with an instrumented overlay.** In a standalone (installed-PWA) iOS 26 app, the **document's containing block is sized screen-minus-top-inset** (e.g. `html.clientHeight` reads 812px) while the **fixed-position viewport is the full screen** (`window.innerHeight` reads 874px). `env(safe-area-inset-*)` reports correctly throughout — only the containing-block math is the trap.

**Consequence**: any surface positioned `absolute` relative to the document sits roughly 62px above the true viewport bottom. This was the root cause of a whole symptom cluster in Session E (black band at the bottom, floating OSM attribution, sheet/bar overlap).

**Rule**: every viewport-anchored surface in this app is `position: fixed`, not `position: absolute` anchored to the document. That's the map container, the bottom bar, every sheet, every banner. `env()`-based safe-area padding is layered on top as usual — the fix is entirely about the positioning scheme, not about measuring anything by hand.

**Applies going forward**: any new viewport-anchored UI (e.g. a future download-progress overlay) must follow this rule from the start; it's cheap to get right up front and was expensive to debug after the fact.

## Component inventory (which surfaces are glass vs. opaque)

| Component | Material | Notes |
|---|---|---|
| `BottomBar.tsx` (bar + ⋯ menu) | `.glass` / `.glass--elevated` | The PoC surface; true frosted glass |
| MapLibre `NavigationControl` / `GeolocateControl` | `.glass` (via `.maplibregl-ctrl-group` selector) | Needed a doubled-selector fix — `maplibre-gl.css` loads after app CSS and won the specificity tie by default |
| `POIPopup.tsx` | `.glass` card | Small, floats over the map |
| Search-results popover (in `BottomBar.tsx`) | `.glass--opaque` | Demoted from glass in code review — large + text-dense |
| `SearchSheet.tsx` (expanded search) | opaque | Full-screen takeover; same reasoning |
| `WalkingTourBottomSheet.tsx` | opaque, grab handle | Uses the shared `BottomSheet` primitive |
| `GuideViewer.tsx` | opaque, grab handle | Own sheet shell (not `BottomSheet`) |
| `PoiEditorSheet.tsx` | opaque, **no grab handle** | Own sheet shell; deliberate — a handle invites casual dismissal of a half-typed draft, so Cancel is the only way out |

Three separate sheet shells (`BottomSheet`, plus `GuideViewer` and `PoiEditorSheet` each implementing their own) is a known, deliberately deferred inconsistency — see the operations runbook's watch items.

## Working in the system

- **Changing a color, blur amount, or radius**: edit the token in `tokens.css`, never a component's inline style or module CSS. If you catch yourself writing a new `rgba(...)` or `blur(...)` value in a component file, that's a signal a token is missing, not a reason to inline it.
- **Adding a new floating control**: use `.glass`; if it's a popover layered on another glass surface, add `.glass--elevated`.
- **Adding a new full sheet or anything with dense scrolling text**: use `.glass--opaque` (or the sheet's existing opaque pattern) — don't default to translucent.
- **Adding any new viewport-anchored element**: `position: fixed`, per D9 above — this is not optional.
- **Adding a new stacking layer**: add a token to the z-index ladder in `tokens.css` at the appropriate tier; don't hardcode a number in component CSS.
