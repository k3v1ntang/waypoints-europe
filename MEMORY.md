# Repo Memory — Current State

> Mutable snapshot of project status, replaced on update — **any session that changes project status must update this file in the same commit** (see CLAUDE.md). Last updated: **2026-08-12**. History: see the active plan's Session Log. How the planning system works: [docs/planning/README.md](docs/planning/README.md).

## Active project

**Trip content — Phase 4 of [docs/planning/2026-07-02-trip-improvement-plan.md](docs/planning/2026-07-02-trip-improvement-plan.md)**, branch `feature/amsterdam-paris`

- **State**: no longer parked. 5 new cities added to `pois.json` — `amsterdam`, `paris`, `ghent`, `bruges`, `rotterdam` (24 POIs: 5 hotels + 19 sights) — a wider scope than the contract's original "Amsterdam + Paris Disneyland" framing, since the real itinerary grew to a 7-city loop. Disneyland Paris itself got **no** separate city/logistics-shell content (contract's D3 scope superseded — just its hotel, filed under `paris`). No walking tours added for the new cities. See `docs/implementation/city-data-contract.md` (also updated this pass) for the corrected field contract.
- `npm run validate:pois`, `lint`, `typecheck`, `test`, and `build` all pass locally. **Not yet verified in a real browser** (no browser-automation tool available in the session that added this data) — visual spot-check of POI popups, marker colors, and city-picker order is still owed before/at merge.
- **Remaining pre-departure**: browse all 5 new cities in the installed PWA on WiFi so their map tiles cache for offline use (Phase 1's offline capability is tile-level, not covered by this data-only change). Also unresolved from before: the four items below.
- Post-trip: Phase 6 (Banff + PMTiles) — scope and cold-start prompt are in [docs/planning/2026-07-03-modernization-plan.md](docs/planning/2026-07-03-modernization-plan.md).

## Open items (non-blocking spot-checks)

- Installed-PWA update path + airplane-mode-across-restart re-check on the post-Phase-5 production build (do before the freeze).
- iOS Reduce Transparency / Reduce Motion toggles (verified via emulation only).
- Edit-export sanity check after the Phase 5 rewrite.
- Re-enable Netlify deploy previews (disabled since PR #2) before the next risky session.

## Next action

Open/merge the `feature/amsterdam-paris` PR, then do the in-browser spot-check it's still owed (city picker, POI popups, hotel marker color) and the pre-departure offline-tile browse above. Feature freeze begins one week before departure (~Aug 22 per D5 in the trip-improvement plan) and admits data/content commits only after that — this change qualifies either side of that date since it's data-only.
