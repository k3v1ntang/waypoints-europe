import { useRef, useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import basePoisData from '../data/pois.json';
import CityNavigation from './CityNavigation.jsx';
import BottomSheet from './BottomSheet.jsx';
import FloatingActionButton from './FloatingActionButton.jsx';
import WalkingTourBottomSheet from './WalkingTourBottomSheet.jsx';
import POIPopup from './POIPopup.jsx';
import { usePoiData } from '../hooks/usePoiData.js';

const LAST_CITY_STORAGE_KEY = 'waypoints-last-city';

// Find a POI (and its city) anywhere in the data set. POI ids are validated
// to be globally unique, so a flat search is safe.
const findPoiById = (poisData, poiId) => {
  for (const city of poisData.cities) {
    const poi = city.pois.find((p) => p.id === poiId);
    if (poi) return { poi, city };
  }
  return null;
};

const shouldShowPOI = (poi, showWalkingTourPOIs) => {
  const visibility = poi.visibility || 'always'; // Default to 'always' for POIs without visibility field
  return visibility === 'walkingTour' ? showWalkingTourPOIs : true;
};

// ❓ CONCEPT: Deriving GeoJSON from state
// 📝 EXPLANATION: Instead of building the map's data imperatively at load
// time, we compute it from the current POI data whenever that data changes
// and push it into the existing source with setData(). This is what lets
// runtime edits (Phase 2) appear on the map without re-initializing it.
const buildGeojson = (poisData, showWalkingTourPOIs) => ({
  type: 'FeatureCollection',
  features: poisData.cities.flatMap((city) =>
    city.pois
      .filter((poi) => shouldShowPOI(poi, showWalkingTourPOIs))
      .map((poi) => ({
        type: 'Feature',
        properties: {
          id: poi.id,
          name: poi.name,
          cityName: city.name,
          isHotel: poi.category === 'hotel'
        },
        geometry: {
          type: 'Point',
          coordinates: poi.coordinates
        }
      }))
  )
});

const Map = () => {
  const mapContainerRef = useRef();
  const mapRef = useRef();
  const hasLoadedRef = useRef(false);
  const mapErrorTimeoutRef = useRef(null);
  const popupStateRef = useRef(null); // { popup, root, poiId } for the open POI popup
  const lastFittedTourRef = useRef(null);
  const { poisData } = usePoiData();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentCity, setCurrentCity] = useState(null);
  const [selectedPoi, setSelectedPoi] = useState(null); // { id } - object so re-selecting re-runs the popup effect
  const [selectedTour, setSelectedTour] = useState(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [showWalkingTourPOIs, setShowWalkingTourPOIs] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Close the open popup and tear down its React root. Deferring unmount()
  // avoids unmounting a root from inside the render cycle that scheduled it.
  const closePopup = useCallback(() => {
    const state = popupStateRef.current;
    if (!state) return;
    popupStateRef.current = null;
    state.popup.remove();
    setTimeout(() => state.root.unmount(), 0);
  }, []);

  // Function to handle walking tour selection
  const handleTourSelect = (tour) => {
    setSelectedTour(tour);
    setShowWalkingTourPOIs(tour !== null); // Show walking tour POIs when a tour is selected
    setIsBottomSheetOpen(false); // Close bottom sheet when tour is selected/deselected
  };

  // Function to handle FAB click
  const handleFABClick = () => {
    setIsBottomSheetOpen(true);
  };

  // Get available tours count for FAB badge
  const getToursCount = () => {
    if (!currentCity || !poisData.walkingTours) return 0;
    const tours = poisData.walkingTours[currentCity.id] || [];
    return tours.length;
  };

  // Function to handle city selection and zoom
  const handleCitySelect = (city) => {
    setCurrentCity(city);
    setSelectedTour(null); // Clear any selected tour when changing cities

    // Remember the selected city so the app reopens here instead of the
    // Europe-wide view every launch.
    try {
      if (city) {
        localStorage.setItem(LAST_CITY_STORAGE_KEY, city.id);
      } else {
        localStorage.removeItem(LAST_CITY_STORAGE_KEY);
      }
    } catch {
      // localStorage unavailable (e.g. Safari private mode) - non-critical
    }

    if (!mapRef.current) return;

    if (city === null) {
      // Show all cities - zoom out to Europe view
      mapRef.current.flyTo({
        center: [15.0, 54.0], // Europe center
        zoom: 4,
        duration: 1500,
        essential: true
      });
    } else {
      // Calculate bounds for the selected city's POIs
      const coordinates = city.pois.map(poi => poi.coordinates);

      if (coordinates.length === 0) return;

      if (coordinates.length === 1) {
        // Single POI - center and zoom in
        mapRef.current.flyTo({
          center: coordinates[0],
          zoom: 14,
          duration: 1500,
          essential: true
        });
      } else {
        // Multiple POIs - fit bounds to show all
        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach(coord => bounds.extend(coord));

        mapRef.current.fitBounds(bounds, {
          padding: { top: 80, bottom: 50, left: 50, right: 50 },
          duration: 1500,
          essential: true
        });
      }
    }
  };

  // Keep the map's POI source in sync with the current data and visibility
  // mode. Runs once when the map first loads (the source starts empty) and
  // again whenever the data or the walking-tour filter changes.
  useEffect(() => {
    if (!mapLoaded) return;
    const source = mapRef.current?.getSource('pois');
    if (!source) return;
    source.setData(buildGeojson(poisData, showWalkingTourPOIs));
  }, [poisData, showWalkingTourPOIs, mapLoaded]);

  // Keep the walking tour route line in sync with the selected tour.
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current;
    const source = map?.getSource('walking-tour-line');
    if (!source) return;

    if (selectedTour) {
      // Increase label minzoom to reduce clutter when route is active
      if (map.getLayer('poi-labels')) {
        map.setLayerZoomRange('poi-labels', 14, 22);
      }

      // Create direct lines between POIs in sequence
      const coordinates = selectedTour.poiSequence
        .map((poiId) => findPoiById(poisData, poiId)?.poi.coordinates)
        .filter(Boolean);

      source.setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates }
      });

      // Fit bounds once per tour selection (not again on data edits)
      if (coordinates.length >= 2 && lastFittedTourRef.current !== selectedTour.id) {
        lastFittedTourRef.current = selectedTour.id;
        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach((coord) => bounds.extend(coord));
        map.fitBounds(bounds, {
          padding: { top: 120, bottom: 50, left: 50, right: 50 },
          duration: 1500
        });
      }
    } else {
      lastFittedTourRef.current = null;
      // Reset label minzoom to original value when route is hidden
      if (map.getLayer('poi-labels')) {
        map.setLayerZoomRange('poi-labels', 13, 22);
      }
      source.setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [] }
      });
    }
  }, [selectedTour, poisData, mapLoaded]);

  // POI popup lifecycle. Because the popup content is rendered by React from
  // current state (rather than a string built inside a map click handler),
  // the walking-tour "Stop X of Y" banner and future edits always reflect
  // the latest data - no stale closures.
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    if (!selectedPoi) {
      closePopup();
      return;
    }

    const found = findPoiById(poisData, selectedPoi.id);
    if (!found) {
      // POI no longer exists (e.g. deleted by an edit) - drop the selection
      closePopup();
      setSelectedPoi(null);
      return;
    }

    const map = mapRef.current;
    const { poi } = found;
    const content = <POIPopup poi={poi} tour={selectedTour} />;
    const existing = popupStateRef.current;

    if (existing && existing.poiId === poi.id) {
      // Same POI - just refresh content/position in place
      existing.root.render(content);
      existing.popup.setLngLat(poi.coordinates);
      return;
    }

    closePopup();

    // Mapbox best practice: center POI on screen before showing popup,
    // with padding so the popup and surrounding UI stay visible.
    map.flyTo({
      center: poi.coordinates,
      zoom: Math.max(map.getZoom(), 14), // Ensure minimum zoom for readability
      padding: { bottom: 250, top: 50, left: 20, right: 20 },
      duration: 800,
      essential: true // Don't skip animation for accessibility
    });

    const container = document.createElement('div');
    const root = createRoot(container);
    root.render(content);

    const popup = new mapboxgl.Popup({
      anchor: 'center', // Center anchor for optimal mobile positioning
      offset: [0, -10], // Slight upward offset for visual balance
      closeButton: false, // Clean mobile UX without close button
      closeOnClick: false, // Selection state drives closing (map click clears it)
      closeOnMove: false, // Don't close when map moves during animation
      maxWidth: 'none' // Let CSS handle responsive width
    })
      .setLngLat(poi.coordinates)
      .setDOMContent(container)
      .addTo(map);

    popup.on('close', () => {
      // Only react if this popup is still the active one (our own closePopup
      // nulls the ref first, so this covers external removals only)
      if (popupStateRef.current?.popup === popup) {
        popupStateRef.current = null;
        setTimeout(() => root.unmount(), 0);
        setSelectedPoi(null);
      }
    });

    popupStateRef.current = { popup, root, poiId: poi.id };
  }, [selectedPoi, selectedTour, poisData, mapLoaded, closePopup]);

  // When POI data changes (runtime edits), refresh the currentCity reference
  // so components receiving it see the updated city object.
  useEffect(() => {
    setCurrentCity((prev) =>
      prev ? poisData.cities.find((c) => c.id === prev.id) ?? null : prev
    );
  }, [poisData]);

  useEffect(() => {
    // ❓ CONCEPT: Prevent duplicate map initialization
    // 💰 COST IMPACT: Each map initialization = 1 API call
    if (mapRef.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

    // Reopen on the last-viewed city instead of the Europe-wide view
    let savedCity = null;
    try {
      const savedCityId = localStorage.getItem(LAST_CITY_STORAGE_KEY);
      savedCity = savedCityId ? basePoisData.cities.find(c => c.id === savedCityId) : null;
    } catch {
      // localStorage unavailable - fall back to the default Europe view
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: savedCity ? savedCity.centerCoordinates : [15.0, 54.0], // Europe center to show all travel cities
      zoom: savedCity ? 12 : 4, // Appropriate zoom to see Munich to Helsinki range
      style: 'mapbox://styles/mapbox/streets-v12'
    });

    if (savedCity) {
      setCurrentCity(savedCity);
    }

    // Mapbox init failures (bad token, no network on first load, etc.) fire
    // 'error' rather than throwing, so React's error boundary can't see them.
    // Once the map has loaded successfully once, later 'error' events are
    // almost always individual tile fetches failing while offline-panning
    // into an area that was never cached - expected and not fatal, so only
    // the map (not the whole UI) should degrade for those.
    //
    // 'error' can also fire once before 'load' during a normal successful
    // init (a transient first-resource hiccup, observed on cold offline
    // launches) - the map goes on to load fine a moment later. So a
    // pre-load error only gets treated as fatal if 'load' still hasn't
    // fired after a short grace period, not on the first error.
    map.on('error', (e) => {
      console.error('Mapbox error:', e.error);
      if (hasLoadedRef.current || mapErrorTimeoutRef.current) return;
      mapErrorTimeoutRef.current = setTimeout(() => {
        mapErrorTimeoutRef.current = null;
        if (!hasLoadedRef.current) {
          setMapError('The map failed to load. Check your connection and try reloading.');
        }
      }, 6000);
    });

    // Add navigation controls (zoom + compass) to top-right corner
    const nav = new mapboxgl.NavigationControl();
    map.addControl(nav, 'top-right');

    // Add geolocation control for current location tracking
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true, // Enable live tracking for travel
      showUserHeading: true   // Show direction user is facing
    });
    map.addControl(geolocate, 'top-right');

    // Wait for map to load, then add clustering functionality
    map.on('load', () => {
      hasLoadedRef.current = true;
      if (mapErrorTimeoutRef.current) {
        clearTimeout(mapErrorTimeoutRef.current);
        mapErrorTimeoutRef.current = null;
      }

      // Add clustered data source. It starts empty; the sync effect fills it
      // from current state as soon as mapLoaded flips to true.
      map.addSource('pois', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 10, // Stop clustering at zoom level 10
        clusterRadius: 50 // Cluster points within 50 pixels
      });

      // Add cluster circles layer
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'pois',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#2563eb',  // Blue for small clusters
            5,
            '#f59e0b',  // Orange for medium clusters
            10,
            '#dc2626'   // Red for large clusters
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            15, // Small clusters
            5,
            20, // Medium clusters
            10,
            25  // Large clusters
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Add cluster count labels
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'pois',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Add individual unclustered points
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'pois',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'case',
            ['get', 'isHotel'],
            '#dc2626', // Red for hotels
            '#2563eb'  // Blue for POIs
          ],
          'circle-radius': 9,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Add POI labels with mobile optimization and variable anchor positioning
      map.addLayer({
        id: 'poi-labels',
        type: 'symbol',
        source: 'pois',
        filter: ['!', ['has', 'point_count']], // Only show labels for unclustered points
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 0,    // Hidden at zoom level 10 and below
            12, 11,   // Small text at zoom 12
            14, 13,   // Medium text at zoom 14
            16, 15    // Larger text at zoom 16+
          ],
          'text-variable-anchor': [
            'top', 'bottom', 'left', 'right',
            'top-left', 'top-right', 'bottom-left', 'bottom-right'
          ],
          'text-radial-offset': 1.2, // Offset from marker center
          'text-justify': 'auto',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'symbol-spacing': 250, // Minimum distance between repeated labels
          'text-max-width': 8,   // Maximum text width in ems
          'text-padding': 4      // Padding around text for collision detection
        },
        paint: {
          'text-color': '#1f2937',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
          'text-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 0,    // Invisible at zoom 10 and below
            11, 0.6,  // Fade in at zoom 11
            12, 1     // Fully visible at zoom 12+
          ]
        }
      });

      // Add walking tour line source (initially empty)
      map.addSource('walking-tour-line', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        }
      });

      // Add walking tour line layer
      map.addLayer({
        id: 'walking-route',
        type: 'line',
        source: 'walking-tour-line',
        minzoom: 12, // Show route at medium zoom level
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#2563eb', // Blue theme color
          'line-width': 3,
          'line-dasharray': [2, 2] // Dashed pattern
        }
      });

      // Handle cluster clicks - zoom in
      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['clusters']
        });
        const clusterId = features[0].properties.cluster_id;
        map.getSource('pois').getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (!err) {
            map.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom
            });
          }
        });
      });

      // Single map-level click handler drives POI selection: clicking a
      // marker selects it (opening the popup), clicking anywhere else
      // clears the selection (closing it). setState functions are stable,
      // so this run-once handler never sees stale state.
      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['unclustered-point']
        });
        if (features.length > 0) {
          setSelectedPoi({ id: features[0].properties.id });
        } else {
          setSelectedPoi(null);
        }
      });

      // Change cursor on hover
      map.on('mouseenter', 'clusters', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'clusters', () => {
        map.getCanvas().style.cursor = '';
      });
      map.on('mouseenter', 'unclustered-point', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'unclustered-point', () => {
        map.getCanvas().style.cursor = '';
      });

      // Flip the React-side flag last so the sync effects run against a
      // fully initialized map (sources + layers all present).
      setMapLoaded(true);
    });

    // Store map reference to prevent duplicate initialization
    mapRef.current = map;

    return () => {
      closePopup();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (mapErrorTimeoutRef.current) {
        clearTimeout(mapErrorTimeoutRef.current);
        mapErrorTimeoutRef.current = null;
      }
      setMapLoaded(false);
    };
  }, [closePopup]);

  return (
    <>
      <div
        ref={mapContainerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: '100dvh', // modern dynamic viewport height (fallback: 100vh)
          width: '100vw',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      />

      {mapError && (
        // Anchored to the bottom (not top) so it can never cover the
        // top-left city nav or the top-right zoom/geolocate controls -
        // those should stay usable even when the map itself failed to load.
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(96px + env(safe-area-inset-bottom))',
            left: '16px',
            right: '16px',
            zIndex: 2000,
            backgroundColor: '#fef2f2',
            border: '1px solid #ef4444',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
        >
          <span style={{ fontSize: '14px', color: '#991b1b' }}>⚠️ {mapError}</span>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            Reload
          </button>
        </div>
      )}

      {/* City Navigation Dropdown */}
      <CityNavigation
        cities={poisData.cities}
        onCitySelect={handleCitySelect}
        currentCity={currentCity}
      />

      {/* Floating Action Button for Walking Tours */}
      <FloatingActionButton
        onClick={handleFABClick}
        icon="🚶‍♂️"
        label="Walking Tours"
        badge={getToursCount() > 0 ? getToursCount() : null}
      />

      {/* Walking Tours Bottom Sheet */}
      <BottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        title="Walking Tours"
      >
        <WalkingTourBottomSheet
          currentCity={currentCity}
          walkingTours={poisData.walkingTours}
          onTourSelect={handleTourSelect}
          selectedTour={selectedTour}
        />
      </BottomSheet>
    </>
  );
};

export default Map;
