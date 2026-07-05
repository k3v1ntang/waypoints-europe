import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { City, Poi, PoisData } from '../data/types';
import styles from './BottomBar.module.css';

// Phase 5 PoC (D8): the bottom-anchored glass control bar, Apple Maps
// shape - search field + grouped Tours/Add-Place actions + ⋯ overflow menu
// (home of Export POI data, and later settings/dark mode/downloads).
// Rendered ALONGSIDE the old controls until the PoC is judged on-device;
// the search logic below is intentionally duplicated from POISearch.jsx,
// which stage 5b deletes.
//
// ❓ CONCEPT: typed props via an interface
// 📝 EXPLANATION: the TS equivalent of a Python dataclass describing a
// function's kwargs. `City | null` is Optional[City]; the `on*` fields are
// typed callbacks (Callable[[Poi], None]) - passing a handler with the
// wrong signature is a compile error, not a runtime surprise.
interface BottomBarProps {
  poisData: PoisData;
  currentCity: City | null;
  /** Tours available in the current city - badge on the Tours button. */
  toursCount: number;
  /** Pending on-device edits - badge on ⋯ and the Export menu item. */
  editCount: number;
  onSelectPoi: (poi: Poi) => void;
  onShowTours: () => void;
  onAddPlace: () => void;
  onExport: () => void;
}

interface SearchEntry {
  poi: Poi;
  cityId: string;
  cityName: string;
  /** poi.name pre-normalized once, so keystrokes only normalize the query. */
  normName: string;
}

const CATEGORY_ICONS: Record<Poi['category'], string> = {
  landmark: '🏛️',
  culture: '🎭',
  food: '🍽️',
  practical: '🧭',
  hotel: '🏨'
};

// Case- and accent-insensitive matching ("cafe" finds "Café")
const normalize = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const MAX_RESULTS = 30;

const BottomBar = ({
  poisData,
  currentCity,
  toursCount,
  editCount,
  onSelectPoi,
  onShowTours,
  onAddPlace,
  onExport
}: BottomBarProps) => {
  const [query, setQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allPois = useMemo<SearchEntry[]>(
    () =>
      poisData.cities.flatMap((city) =>
        city.pois.map((poi) => ({
          poi,
          cityId: city.id,
          cityName: city.name,
          normName: normalize(poi.name)
        }))
      ),
    [poisData]
  );

  const results = useMemo<SearchEntry[]>(() => {
    const needle = normalize(query.trim());
    if (!needle) return [];
    const matches = allPois.filter(({ normName }) => normName.includes(needle));
    // Results in the city currently on screen first. Number() turns the
    // boolean comparison into the -1/0/1 contract sort() expects.
    matches.sort(
      (a, b) =>
        Number(b.cityId === currentCity?.id) - Number(a.cityId === currentCity?.id)
    );
    return matches.slice(0, MAX_RESULTS);
  }, [query, allPois, currentCity]);

  const showResults = query.trim().length > 0;

  // One atomic "dismiss everything" for all close paths (outside press,
  // action buttons) so no site can forget half the popover state.
  // ❓ CONCEPT: useCallback
  // 📝 EXPLANATION: functions defined in a component body are re-created
  // every render; useCallback keeps one stable identity (like caching a
  // bound method) so effects listing it as a dependency don't re-run per
  // render. Setter functions from useState are already stable, so [] deps.
  const closePopovers = useCallback(() => {
    setIsMenuOpen(false);
    setQuery('');
  }, []);

  // Dismiss popovers on any press outside the bar. 'pointerdown' covers
  // mouse and touch in one event (vs the old mousedown+touchstart pair).
  useEffect(() => {
    if (!isMenuOpen && !showResults) return;
    const handlePointerDown = (event: PointerEvent) => {
      // ❓ CONCEPT: `instanceof Node` type guard
      // 📝 EXPLANATION: event.target is typed as the loose EventTarget;
      // the runtime check narrows it so .contains() typechecks - TS's
      // version of isinstance() narrowing.
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      closePopovers();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isMenuOpen, showResults, closePopovers]);

  const handleSelectPoi = (poi: Poi) => {
    setQuery('');
    inputRef.current?.blur();
    onSelectPoi(poi);
  };

  return (
    <div ref={rootRef} className={styles.root}>
      {/* Search results popover - grows upward from the bar. Opaque, not
          glass: at up to 40dvh it would be the app's largest blur surface
          (D4 restricts glass to small floating controls over the WebGL
          map), and dense scrolling text is most legible on a solid fill. */}
      {showResults && (
        <div className={`glass glass--opaque ${styles.results}`} role="listbox" aria-label="Search results">
          {results.length === 0 ? (
            <div className={styles.noResults}>No places match “{query.trim()}”</div>
          ) : (
            results.map(({ poi, cityName }) => (
              <button
                key={poi.id}
                role="option"
                aria-selected={false}
                className={styles.resultItem}
                onClick={() => handleSelectPoi(poi)}
              >
                {/* The type says category is always a known key, but POIs
                    edited on-device (IndexedDB) aren't compile-checked, so
                    keep a runtime fallback. */}
                <span className={styles.menuItemIcon}>{CATEGORY_ICONS[poi.category] ?? '📍'}</span>
                <span className={styles.resultText}>
                  <span className={styles.resultName}>{poi.name}</span>
                  <span className={styles.menuItemSubtitle}>{cityName.split(' (')[0]}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* ⋯ overflow menu popover */}
      {isMenuOpen && (
        <div className={`glass glass--elevated ${styles.menu}`} role="menu" aria-label="More actions">
          <button
            role="menuitem"
            className={styles.menuItem}
            onClick={() => {
              setIsMenuOpen(false);
              onExport();
            }}
          >
            <span className={styles.menuItemIcon}>📤</span>
            <span>
              <span className={styles.menuItemTitle}>Export POI data</span>
              <span className={styles.menuItemSubtitle}>
                {editCount > 0
                  ? `${editCount} ${editCount === 1 ? 'edit' : 'edits'} on this device`
                  : 'No edits on this device yet'}
              </span>
            </span>
            {editCount > 0 && <span className={styles.menuBadge}>{editCount}</span>}
          </button>
        </div>
      )}

      {/* The bar itself */}
      <div className={`glass ${styles.bar}`}>
        <div className={styles.searchField}>
          <span className={styles.searchIcon} aria-hidden="true">🔍</span>
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            className={styles.searchInput}
            value={query}
            placeholder="Search places…"
            aria-label="Search places"
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsMenuOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setQuery('');
                inputRef.current?.blur();
              }
              if (e.key === 'Enter' && results.length > 0 && results[0]) {
                handleSelectPoi(results[0].poi);
              }
            }}
          />
          {query && (
            <button className={styles.searchClear} aria-label="Clear search" onClick={() => setQuery('')}>
              ✕
            </button>
          )}
        </div>

        {/* Grouped direct actions (HIG: related actions share one group) */}
        <div className={styles.buttonGroup}>
          <button
            className={styles.groupButton}
            aria-label="Walking tours"
            title="Walking Tours"
            onClick={() => {
              closePopovers();
              onShowTours();
            }}
          >
            🚶
            {toursCount > 0 && <span className={styles.badge}>{toursCount}</span>}
          </button>
          <button
            className={styles.groupButton}
            aria-label="Add place"
            title="Add Place"
            onClick={() => {
              closePopovers();
              onAddPlace();
            }}
          >
            ➕
          </button>
        </div>

        {/* Overflow - data management & future settings live here (D8) */}
        <button
          className={styles.moreButton}
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          title="More"
          onClick={() => {
            setQuery('');
            setIsMenuOpen((open) => !open);
          }}
        >
          ⋯
          {editCount > 0 && <span className={styles.badge}>{editCount}</span>}
        </button>
      </div>
    </div>
  );
};

export default BottomBar;
