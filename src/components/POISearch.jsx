import { useState, useMemo, useRef, useEffect } from 'react';

// Client-side POI name search (Phase 2, decision D5). Searches the merged
// in-memory data - no index, no network, no new dependencies - so it works
// identically offline. Doubles as the "find a POI to edit" mechanism: a
// result tap opens the POI popup, which carries the Edit button.

const CATEGORY_ICONS = {
  landmark: '🏛️',
  culture: '🎭',
  food: '🍽️',
  practical: '🧭',
  hotel: '🏨'
};

// Case- and accent-insensitive matching ("cafe" finds "Café")
const normalize = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const MAX_RESULTS = 30;

const POISearch = ({ poisData, currentCityId, onSelectPoi }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const allPois = useMemo(
    () =>
      poisData.cities.flatMap((city) =>
        city.pois.map((poi) => ({ poi, cityId: city.id, cityName: city.name }))
      ),
    [poisData]
  );

  const results = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return [];
    const matches = allPois.filter(({ poi }) => normalize(poi.name).includes(needle));
    // Results in the city currently on screen first
    matches.sort((a, b) => (b.cityId === currentCityId) - (a.cityId === currentCityId));
    return matches.slice(0, MAX_RESULTS);
  }, [query, allPois, currentCityId]);

  const handleSelect = (poi) => {
    setIsOpen(false);
    setQuery('');
    onSelectPoi(poi);
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Search places"
        title="Search places"
        style={{
          position: 'absolute',
          top: '10px',
          right: '54px', // clear of the Mapbox nav controls in the corner
          zIndex: 1000,
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          backgroundColor: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          cursor: 'pointer',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        🔍
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        right: '10px',
        zIndex: 1100, // above the city dropdown while searching
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px 6px 16px' }}>
          <span style={{ fontSize: '16px' }}>🔍</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleClose();
              if (e.key === 'Enter' && results.length > 0) handleSelect(results[0].poi);
            }}
            placeholder="Search places…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '16px', // prevents iOS focus zoom
              padding: '10px 0',
              color: '#1f2937',
              backgroundColor: 'transparent'
            }}
          />
          <button
            onClick={handleClose}
            aria-label="Close search"
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#6b7280',
              padding: '10px',
              fontWeight: 600
            }}
          >
            ✕
          </button>
        </div>

        {query.trim() && (
          <div
            style={{
              borderTop: '1px solid #f3f4f6',
              maxHeight: '50vh',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {results.length === 0 ? (
              <div style={{ padding: '16px 20px', fontSize: '14px', color: '#9ca3af' }}>
                No places match “{query.trim()}”
              </div>
            ) : (
              results.map(({ poi, cityName }) => (
                <button
                  key={poi.id}
                  onClick={() => handleSelect(poi)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    borderBottom: '1px solid #f9fafb',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>
                    {CATEGORY_ICONS[poi.category] ?? '📍'}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#1f2937',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {poi.name}
                    </span>
                    <span style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                      {cityName.split(' (')[0]}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default POISearch;
