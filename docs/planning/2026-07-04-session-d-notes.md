# Session D notes for the orchestrator — Phase 5a + PoC (2026-07-04)

Worker-session note per the Session D prompt: deviations and observations are
recorded here rather than edited into the plan (plan edits are
orchestrator-only per §5).

## Deviations from D8 / the plan text

1. **Old FABs repositioned during the comparison period.** The plan's Session
   D row says "old controls untouched", but both stacked FABs live at
   `bottom: 24px/92px` — exactly where the new bar renders. They are nudged up
   via their **existing `bottom` prop** (a two-line change in `Map.jsx`; the
   `FloatingActionButton` component itself is untouched) so both generations
   of controls are visible and tappable side by side. Stage 5b deletes them.

2. **PoC search is functional but is not the D8 "expanded search sheet".**
   The bar's search field filters all POIs and shows results in a glass
   popover growing upward from the bar (selecting a result flies to the POI
   and opens its popup, same as the old top-right search). The full expanded
   sheet — city chips section, sheet expansion, city selection moving out of
   the top-left pill — is stage 5b scope and is not in the PoC. Consequence:
   the top-left `CityNavigation` pill remains the only city switcher for now.

3. **iOS keyboard overlap is a known, deferred issue.** With the on-screen
   keyboard up, iOS Safari keeps `position: fixed` elements anchored to the
   layout viewport, so the bar (and the bottom edge of the results popover)
   can sit behind the keyboard while typing. The results list is capped at
   `40dvh` above the bar so the top of the list stays visible, but proper
   handling (Apple-Maps-style sheet expansion on focus, or
   `interactive-widget=resizes-content`) belongs to the 5b expanded-sheet
   work. Worth checking during the PoC iPhone judgment but not a PoC gate.

4. **Search logic duplicated from `POISearch.jsx`** (normalize + filter +
   current-city-first sort). Deliberate temporary duplication: POISearch is
   deleted in 5b, at which point the copy in `BottomBar.tsx` is the only one.

5. **tsconfig scope extended** with `src/components/**/*.tsx`,
   `src/vite-env.d.ts`, and `"jsx": "react-jsx"` so born-`.tsx` components
   are actually typechecked (the Session C `include` scoping deliberately
   excluded components; Phase 5 is where they start existing as TS).

## Material calibration (D4 tint bias, for the on-device judgment)

Built at the tinted/frosted end per the 2026-07-04 D4 amendment: fill opacity
0.82 light / 0.80 dark (`--glass-fill`), `blur(22px) saturate(1.7)`. If the
PoC verdict is "too opaque / not glassy enough", the knobs are the four
`--glass-*` tokens in `src/styles/tokens.css` — no component changes needed.

## Post-review adjustment (from the /code-review gate)

The search-results panel is **opaque** (`.glass--opaque` variant: solid fill,
no blur, same border/radius/shadow language), not translucent glass. Review
flagged that at up to `40dvh` it would have been the app's largest
backdrop-filter surface over the live WebGL map — exactly what D4's
small-surfaces-only constraint exists to prevent — and dense scrolling text
is most legible on a solid fill anyway. The bar and the ⋯ menu remain true
glass. If the on-device verdict wants the results panel glassy after all,
swap its class back to `glass--elevated` (one line in `BottomBar.tsx`).

## Not done (correctly out of PoC scope, listed to avoid surprises)

- D8's map-chrome slimming (hide zoom/compass on touch, single glass
  geolocate) — stage 5b.
- `motion` library springs — 5b; the PoC uses small CSS transitions that
  honor `prefers-reduced-motion`.
- Dark mode exists **for the new bar only** (token overrides via
  `prefers-color-scheme`); old surfaces are unchanged, so a dark-mode device
  shows a mixed appearance during the comparison period.
