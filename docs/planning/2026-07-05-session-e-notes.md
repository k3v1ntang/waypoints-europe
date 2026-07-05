# Session E notes for the orchestrator — Phase 5b (2026-07-05)

Worker-session note per §5: deviations and observations recorded here, not
in the plan (plan edits are orchestrator-only).

## Deviations from the plan text

1. **iOS keyboard overlap solved by geometry, not by sheet-growing.** D8's
   "expanded search sheet" is implemented as a full-screen takeover whose
   search field is anchored to the TOP of the screen (Apple Maps' own
   behavior on search focus). With the field at the top, iOS Safari's
   fixed-position-vs-keyboard quirk can't cover it; the results list
   additionally pads its bottom by the keyboard height via the
   visualViewport API. `interactive-widget=resizes-content` was also added
   to the viewport meta (honored by Chrome/Android; ignored by iOS today).

2. **The expanded sheet is opaque, not glass.** Same D4 reasoning the
   Session D review applied to the results popover: a full-screen surface
   is exactly what the small-surfaces-only constraint exists to prevent,
   and it is the app's most text-dense surface. The bar, ⋯ menu, POI popup
   card, and map controls are true glass; large sheets (search, tours,
   editor, guide) are the opaque end of the system (same tokens/radius/
   shadow language).

3. **Grab handles: tours sheet and guide sheet only.** The editor sheet
   deliberately has no handle — its only dismissal is the explicit Cancel
   button (a handle invites casual dismissal, and the sheet's design goal
   is that a half-typed draft is never thrown away by an accidental tap).
   Plan text said "tour/editor sheets with grab handles"; deviated for the
   editor on that rationale.

4. **Positron map style not adopted.** Plan step 4 said "consider
   Positron"; Liberty was kept — it passed the Phase 1 on-device style
   check and a mid-phase style swap would invalidate that verification.
   One-line change later if wanted.

5. **PoiEditorSheet no longer uses `window.confirm`-free flows** — kept
   `window.confirm` for delete/reset as before (unchanged), noted only
   because the surrounding component was rewritten.

## Bugs surfaced by the TypeScript conversion (fixed in this session)

- **Cluster-click zoom was a silent no-op.** `getClusterExpansionZoom` has
  been Promise-based since MapLibre v4; the code still passed the old
  Mapbox-style callback, which was ignored — tapping a cluster did nothing.
  Converted to the Promise API.
- **`showUserHeading: true` on GeolocateControl** is a Mapbox-only option
  MapLibre never had; dropped (it was doing nothing).
- **Map label fonts 404'd on every load since Phase 1**: the layers asked
  OpenFreeMap's glyph server for Mapbox's "DIN Offc Pro Medium" stack
  (labels only rendered via fallback). Switched to Noto Sans
  Regular/Bold, which OpenFreeMap serves (verified 200s).
- **OSM attribution was hidden behind the new bottom bar** (ODbL requires
  it visible). Bottom map chrome now lifts above the bar on viewports
  ≤900px; on wider windows the centered bar can't cover the corners.

## Verification notes (headless Chromium, Playwright; NOT a substitute for
   the on-device pass)

- Touch context (iPhone 13 profile): zoom/compass hidden, geolocate
  visible; desktop context: all controls visible.
- City chips switch cities, bar label updates ("Search Copenhagen…"),
  selection survives reload (localStorage).
- Search → result → flyTo → glass popup card (incl. walking-tour stop
  banner) all work; ⋯ menu shows Export + build stamp.
- Editor: draft survives tap-on-map picking round-trip; picked coordinates
  land in the form.
- Dark mode: every surface consistent (Session D's "mixed look" resolved).
- `prefers-reduced-transparency: reduce` (CDP-emulated): bar renders
  opaque rgb(248,249,251), backdrop-filter: none. Chromium-verified only —
  the iOS Reduce Transparency setting still needs the on-device check.

## Not done / left open

- `react-hooks/set-state-in-effect` lint exemptions were removed with the
  rewrites; remaining setState-in-effect patterns were restructured
  (derived city state, render-time adjustments) rather than suppressed.
- `src/config/theme.js` is now referenced by nothing in src/ (tokens.css
  took over); left in place because CLAUDE.md documents it as a key file —
  orchestrator may want a doc-update or deletion decision.
- CLAUDE.md's project-structure section still lists the deleted .jsx
  components; doc update is orchestrator scope.
- Pre-existing >500 kB chunk watch item unchanged (motion adds ~35 kB
  gzipped to the bundle).
