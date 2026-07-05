import { useState, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { City, Poi, PoisData } from '../data/types';
import { springSheet } from '../config/motion';
import styles from './SearchSheet.module.css';

// Phase 5b (D8): the expanded search sheet - the single home of POI search
// AND city switching. Opened from the BottomBar's search field; replaces
// both the old top-right POISearch and the top-left CityNavigation pill.

interface SearchSheetProps {
  isOpen: boolean;
  poisData: PoisData;
  currentCity: City | null;
  onSelectPoi: (poi: Poi) => void;
  /** null = zoom out to the all-cities Europe view. */
  onSelectCity: (city: City | null) => void;
  onClose: () => void;
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

// Travel itinerary order for the city chips; cities not listed (future
// additions) fall to the end in data order. Same ordering the old
// CityNavigation dropdown used.
const ITINERARY_ORDER = ['munich', 'helsinki', 'tallinn', 'stockholm', 'copenhagen', 'malmo'];

// "DE" -> 🇩🇪. Flag emoji are literally the two "regional indicator" code
// points for the country letters; computing them replaces the old
// hand-written countryCode-to-flag lookup and works for any future city.
const flagEmoji = (countryCode: string): string =>
  countryCode.length === 2
    ? String.fromCodePoint(
        ...[...countryCode.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
      )
    : '📍';

const cityDisplayName = (name: string): string => name.split(' (')[0] ?? name;

// Height of the on-screen keyboard, measured via the visualViewport API.
//
// ❓ CONCEPT: layout viewport vs visual viewport
// 📝 EXPLANATION: position:fixed elements are laid out against the LAYOUT
// viewport, which iOS Safari does not shrink when the keyboard opens - the
// keyboard just covers the bottom of it. window.visualViewport reports the
// truly visible region, so (innerHeight - visualViewport.height) ≈ keyboard
// height. Padding the scroll area by that amount keeps the last results
// reachable above the keyboard.
const useKeyboardInset = (): number => {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () =>
      setInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    viewport.addEventListener('resize', update);
    return () => viewport.removeEventListener('resize', update);
  }, []);
  return inset;
};

// Inner body component: mounted fresh each time the sheet opens, so query
// state resets naturally instead of via a "clear on open" effect.
const SearchSheetBody = ({
  poisData,
  currentCity,
  onSelectPoi,
  onSelectCity,
  onClose
}: Omit<SearchSheetProps, 'isOpen'>) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const keyboardInset = useKeyboardInset();

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

  const sortedCities = useMemo(() => {
    const orderIndex = (city: City) => {
      const index = ITINERARY_ORDER.indexOf(city.id);
      return index === -1 ? ITINERARY_ORDER.length : index;
    };
    return [...poisData.cities].sort((a, b) => orderIndex(a) - orderIndex(b));
  }, [poisData]);

  const handleSelectPoi = (poi: Poi) => {
    inputRef.current?.blur(); // dismiss the keyboard before the map flies
    onSelectPoi(poi);
    onClose();
  };

  const handleSelectCity = (city: City | null) => {
    inputRef.current?.blur();
    onSelectCity(city);
    onClose();
  };

  const showResults = query.trim().length > 0;

  return (
    <>
      <div className={styles.header}>
        <div className={styles.searchField}>
          <span className={styles.searchIcon} aria-hidden="true">
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            className={styles.searchInput}
            value={query}
            placeholder="Search places…"
            aria-label="Search places"
            // Opening the sheet IS the intent to type (Apple Maps behavior),
            // so focus lands in the field immediately.
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && results[0]) handleSelectPoi(results[0].poi);
            }}
          />
          {query && (
            <button
              className={styles.searchClear}
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
            >
              ✕
            </button>
          )}
        </div>
        <button className={styles.cancelButton} onClick={onClose}>
          Cancel
        </button>
      </div>

      <div className={styles.body} style={{ paddingBottom: keyboardInset }}>
        {showResults ? (
          <div role="listbox" aria-label="Search results">
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
                  <span className={styles.resultIcon}>{CATEGORY_ICONS[poi.category] ?? '📍'}</span>
                  <span className={styles.resultText}>
                    <span className={styles.resultName}>{poi.name}</span>
                    <span className={styles.resultCity}>{cityDisplayName(cityName)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            <h2 className={styles.sectionTitle}>Cities</h2>
            <div className={styles.chipGrid}>
              <button
                className={currentCity === null ? styles.chipSelected : styles.chip}
                onClick={() => handleSelectCity(null)}
              >
                <span className={styles.chipFlag} aria-hidden="true">🌍</span>
                All Cities
              </button>
              {sortedCities.map((city) => (
                <button
                  key={city.id}
                  className={currentCity?.id === city.id ? styles.chipSelected : styles.chip}
                  onClick={() => handleSelectCity(city)}
                >
                  <span className={styles.chipFlag} aria-hidden="true">
                    {flagEmoji(city.countryCode)}
                  </span>
                  {cityDisplayName(city.name)}
                  <span className={styles.chipCount}>{city.pois.length}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
};

const SearchSheet = ({ isOpen, ...bodyProps }: SearchSheetProps) => (
  // ❓ CONCEPT: AnimatePresence
  // 📝 EXPLANATION: React normally removes an element from the DOM the
  // instant it stops being rendered - there is no moment for an exit
  // animation to play. AnimatePresence keeps the leaving element mounted
  // until its `exit` animation finishes, then removes it.
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label="Search and city selection"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={springSheet}
      >
        <SearchSheetBody {...bodyProps} />
      </motion.div>
    )}
  </AnimatePresence>
);

export default SearchSheet;
