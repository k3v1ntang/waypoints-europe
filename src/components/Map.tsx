import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import basePoisData from '../data/pois.json';
import BottomSheet from './BottomSheet';
import WalkingTourBottomSheet from './WalkingTourBottomSheet';
import POIPopup from './POIPopup';
import PoiEditorSheet, { type EditorSession } from './PoiEditorSheet';
import BottomBar from './BottomBar';
import SearchSheet from './SearchSheet';
import { usePoiData } from '../hooks/usePoiData';
import { exportMergedPois } from '../data/exportPois.js';
import type { City, Poi, PoisData, WalkingTour } from '../data/types';
import styles from './Map.module.css';

const LAST_CITY_STORAGE_KEY = 'waypoints-last-city';

// Same `unknown` bridge as usePoiData: the JSON import's inferred shape is
// wider than PoisData (number[] vs [number, number] tuples); the validate
// script enforces the real shape at build time.
const typedBasePoisData = basePoisData as unknown as PoisData;

// Find a POI (and its city) anywhere in the data set. POI ids are validated
// to be globally unique, so a flat search is safe.
const findPoiById = (poisData: PoisData, poiId: string): { poi: Poi; city: City } | null => {
  for (const city of poisData.cities) {
    const poi = city.pois.find((p) => p.id === poiId);
    if (poi) return { poi, city };
  }
  return null;
};

const shouldShowPOI = (poi: Poi, showWalkingTourPOIs: boolean): boolean => {
  const visibility = poi.visibility || 'always'; // Default to 'always' for POIs without visibility field
  return visibility === 'walkingTour' ? showWalkingTourPOIs : true;
};

// ❓ CONCEPT: Deriving GeoJSON from state
// 📝 EXPLANATION: Instead of building the map's data imperatively at load
// time, we compute it from the current POI data whenever that data changes
// and push it into the existing source with setData(). This is what lets
// runtime edits (Phase 2) appear on the map without re-initializing it.
const buildGeojson = (
  poisData: PoisData,
  showWalkingTourPOIs: boolean
): FeatureCollection<Point> => ({
  type: 'FeatureCollection',
  features: poisData.cities.flatMap((city) =>
    city.pois
      .filter((poi) => shouldShowPOI(poi, showWalkingTourPOIs))
      .map((poi) => ({
        type: 'Feature' as const,
        properties: {
          id: poi.id,
          name: poi.name,
          cityName: city.name,
          isHotel: poi.category === 'hotel'
        },
        geometry: {
          type: 'Point' as const,
          coordinates: poi.coordinates
        }
      }))
  )
});

const EMPTY_LINE: Feature<LineString> = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: [] }
};

interface PopupState {
  popup: maplibregl.Popup;
  root: Root;
  poiId: string;
}

const Map = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hasLoadedRef = useRef(false);
  const mapErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popupStateRef = useRef<PopupState | null>(null); // the open POI popup
  const lastFittedTourRef = useRef<string | null>(null);
  const pickingRef = useRef(false); // mirror of isPicking for the run-once map click handler
  const { poisData, savePoi, deletePoi, resetPoi, isBasePoi, hasEdit, editCount } = usePoiData();
  const [mapLoaded, setMapLoaded] = useState(false);
  // City selection is stored as an ID and the City object derived from the
  // live data, so runtime edits can never leave a stale object in state.
  const [currentCityId, setCurrentCityId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_CITY_STORAGE_KEY);
    } catch {
      return null; // localStorage unavailable (e.g. Safari private mode)
    }
  });
  const [selectedPoi, setSelectedPoi] = useState<{ id: string } | null>(null); // object so re-selecting re-runs the popup effect
  const [selectedTour, setSelectedTour] = useState<WalkingTour | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showWalkingTourPOIs, setShowWalkingTourPOIs] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [editorSession, setEditorSession] = useState<EditorSession | null>(null);
  const [isPicking, setIsPicking] = useState(false); // tap-on-map coordinate picking mode
  const [pickedCoordinates, setPickedCoordinates] = useState<[number, number] | null>(null);

  const currentCity = useMemo<City | null>(
    () => (currentCityId ? poisData.cities.find((c) => c.id === currentCityId) ?? null : null),
    [poisData, currentCityId]
  );

  // Drop a selection whose POI no longer exists (deleted by an edit).
  // Adjusting state during render (see PoiEditorSheet for the concept
  // note) - React restarts the render before anything is committed.
  if (selectedPoi && !findPoiById(poisData, selectedPoi.id)) {
    setSelectedPoi(null);
  }

  // Close the open popup and tear down its React root. Deferring unmount()
  // avoids unmounting a root from inside the render cycle that scheduled it.
  const closePopup = useCallback(() => {
    const state = popupStateRef.current;
    if (!state) return;
    popupStateRef.current = null;
    state.popup.remove();
    setTimeout(() => state.root.unmount(), 0);
  }, []);

  // --- POI editing (Phase 2) ---

  const handleEditPoi = useCallback((poi: Poi) => {
    setPickedCoordinates(null);
    const found = findPoiById(poisData, poi.id);
    setEditorSession({ poi, cityId: found?.city.id ?? null });
  }, [poisData]);

  const handleAddPoi = () => {
    setPickedCoordinates(null);
    setEditorSession({ poi: null, cityId: currentCityId });
  };

  const handleCloseEditor = () => {
    setEditorSession(null);
    setIsPicking(false);
    setPickedCoordinates(null);
  };

  // Save, then select the POI so the popup shows (or refreshes to) the result.
  const handleSavePoi = async (poi: Poi, cityId: string) => {
    await savePoi(poi, cityId);
    setSelectedPoi({ id: poi.id });
  };

  const handleTourSelect = (tour: WalkingTour | null) => {
    setSelectedTour(tour);
    setShowWalkingTourPOIs(tour !== null); // Show walking tour POIs when a tour is selected
    setIsBottomSheetOpen(false); // Close bottom sheet when tour is selected/deselected
  };

  // Tours available in the current city - badge on the BottomBar.
  const toursCount =
    currentCity && poisData.walkingTours
      ? (poisData.walkingTours[currentCity.id] || []).length
      : 0;

  // City selection (from the SearchSheet's chips): remember it and fly there.
  const handleCitySelect = (city: City | null) => {
    setCurrentCityId(city?.id ?? null);
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
      const coordinates = city.pois.map((poi) => poi.coordinates);

      if (coordinates.length === 0) return;

      if (coordinates.length === 1 && coordinates[0]) {
        // Single POI - center and zoom in
        mapRef.current.flyTo({
          center: coordinates[0],
          zoom: 14,
          duration: 1500,
          essential: true
        });
      } else {
        // Multiple POIs - fit bounds to show all
        const bounds = new maplibregl.LngLatBounds();
        coordinates.forEach((coord) => bounds.extend(coord));

        mapRef.current.fitBounds(bounds, {
          padding: { top: 80, bottom: 50, left: 50, right: 50 },
          duration: 1500,
          essential: true
        });
      }
    }
  };

  // Keep the run-once map click handler aware of picking mode, and switch
  // the cursor so desktop testing makes the mode visible.
  useEffect(() => {
    pickingRef.current = isPicking;
    const canvas = mapRef.current?.getCanvas();
    if (canvas) canvas.style.cursor = isPicking ? 'crosshair' : '';
  }, [isPicking]);

  // Keep the map's POI source in sync with the current data and visibility
  // mode. Runs once when the map first loads (the source starts empty) and
  // again whenever the data or the walking-tour filter changes.
  useEffect(() => {
    if (!mapLoaded) return;
    const source = mapRef.current?.getSource<maplibregl.GeoJSONSource>('pois');
    if (!source) return;
    source.setData(buildGeojson(poisData, showWalkingTourPOIs));
  }, [poisData, showWalkingTourPOIs, mapLoaded]);

  // Keep the walking tour route line in sync with the selected tour.
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current;
    const source = map?.getSource<maplibregl.GeoJSONSource>('walking-tour-line');
    if (!map || !source) return;

    if (selectedTour) {
      // Increase label minzoom to reduce clutter when route is active
      if (map.getLayer('poi-labels')) {
        map.setLayerZoomRange('poi-labels', 14, 22);
      }

      // Create direct lines between POIs in sequence
      const coordinates = selectedTour.poiSequence
        .map((poiId) => findPoiById(poisData, poiId)?.poi.coordinates)
        .filter((coord): coord is [number, number] => Boolean(coord));

      source.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates }
      });

      // Fit bounds once per tour selection (not again on data edits)
      if (coordinates.length >= 2 && lastFittedTourRef.current !== selectedTour.id) {
        lastFittedTourRef.current = selectedTour.id;
        const bounds = new maplibregl.LngLatBounds();
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
      source.setData(EMPTY_LINE);
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
    // A vanished POI is handled by the render-time adjustment above; this
    // guard only covers the window before that re-render's effects run.
    if (!found) {
      closePopup();
      return;
    }

    const map = mapRef.current;
    const { poi } = found;
    const content = <POIPopup poi={poi} tour={selectedTour} onEdit={handleEditPoi} />;
    const existing = popupStateRef.current;

    if (existing && existing.poiId === poi.id) {
      // Same POI - just refresh content/position in place
      existing.root.render(content);
      existing.popup.setLngLat(poi.coordinates);
      return;
    }

    closePopup();

    // Best practice: center POI on screen before showing popup,
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

    const popup = new maplibregl.Popup({
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
  }, [selectedPoi, selectedTour, poisData, mapLoaded, closePopup, handleEditPoi]);

  useEffect(() => {
    // ❓ CONCEPT: Prevent duplicate map initialization
    if (mapRef.current || !mapContainerRef.current) return;

    // Reopen on the last-viewed city instead of the Europe-wide view. Reads
    // the lazily-initialized state's first value via localStorage again so
    // this run-once effect needs no state dependency.
    let savedCity: City | null = null;
    try {
      const savedCityId = localStorage.getItem(LAST_CITY_STORAGE_KEY);
      savedCity = savedCityId
        ? typedBasePoisData.cities.find((c) => c.id === savedCityId) ?? null
        : null;
    } catch {
      // localStorage unavailable - fall back to the default Europe view
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      center: savedCity ? savedCity.centerCoordinates : [15.0, 54.0], // Europe center to show all travel cities
      zoom: savedCity ? 12 : 4, // Appropriate zoom to see Munich to Helsinki range
      style: 'https://tiles.openfreemap.org/styles/liberty'
    });

    // MapLibre init failures (no network on first load, etc.) fire
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
      console.error('MapLibre error:', e.error);
      if (hasLoadedRef.current || mapErrorTimeoutRef.current) return;
      mapErrorTimeoutRef.current = setTimeout(() => {
        mapErrorTimeoutRef.current = null;
        if (!hasLoadedRef.current) {
          setMapError('The map failed to load. Check your connection and try reloading.');
        }
      }, 6000);
    });

    // Zoom + compass controls; CSS hides them on touch devices (D8), where
    // pinch/rotate gestures cover the same ground.
    const nav = new maplibregl.NavigationControl();
    map.addControl(nav, 'top-right');

    // Add geolocation control for current location tracking
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true // Enable live tracking for travel
      // (the old showUserHeading option was Mapbox-only - MapLibre's
      // GeolocateControl never had it; TS conversion surfaced the no-op)
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
            '#2563eb', // Blue for small clusters
            5,
            '#f59e0b', // Orange for medium clusters
            10,
            '#dc2626' // Red for large clusters
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            15, // Small clusters
            5,
            20, // Medium clusters
            10,
            25 // Large clusters
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
          'text-font': ['Noto Sans Bold'],
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
            '#2563eb' // Blue for POIs
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
          'text-font': ['Noto Sans Regular'],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 0, // Hidden at zoom level 10 and below
            12, 11, // Small text at zoom 12
            14, 13, // Medium text at zoom 14
            16, 15 // Larger text at zoom 16+
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
          'text-max-width': 8, // Maximum text width in ems
          'text-padding': 4 // Padding around text for collision detection
        },
        paint: {
          'text-color': '#1f2937',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
          'text-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 0, // Invisible at zoom 10 and below
            11, 0.6, // Fade in at zoom 11
            12, 1 // Fully visible at zoom 12+
          ]
        }
      });

      // Add walking tour line source (initially empty)
      map.addSource('walking-tour-line', {
        type: 'geojson',
        data: EMPTY_LINE
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

      // Handle cluster clicks - zoom in.
      // getClusterExpansionZoom is Promise-based since MapLibre v4 (the old
      // Mapbox-era callback form was silently a no-op after the migration -
      // caught by the TypeScript conversion, Phase 5b).
      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['clusters']
        });
        const feature = features[0];
        const source = map.getSource<maplibregl.GeoJSONSource>('pois');
        if (!feature || !source || feature.geometry.type !== 'Point') return;
        const clusterId = feature.properties.cluster_id as number;
        source
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => {
            map.easeTo({
              center: feature.geometry.type === 'Point'
                ? (feature.geometry.coordinates as [number, number])
                : e.lngLat,
              zoom
            });
          })
          .catch(() => {
            // Cluster no longer exists at this zoom - nothing to do
          });
      });

      // Single map-level click handler drives POI selection: clicking a
      // marker selects it (opening the popup), clicking anywhere else
      // clears the selection (closing it). setState functions are stable,
      // so this run-once handler never sees stale state.
      map.on('click', (e) => {
        // In picking mode the click sets the edit form's coordinates
        // instead of selecting/deselecting POIs.
        if (pickingRef.current) {
          setPickedCoordinates([e.lngLat.lng, e.lngLat.lat]);
          setIsPicking(false);
          return;
        }
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['unclustered-point']
        });
        const id = features[0]?.properties.id;
        setSelectedPoi(typeof id === 'string' ? { id } : null);
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
      <div ref={mapContainerRef} className={styles.container} />

      {mapError && (
        <div className={styles.errorBanner}>
          <span className={styles.errorText}>⚠️ {mapError}</span>
          <button className={styles.errorReload} onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      )}

      {/* Coordinate picking banner - the editor sheet is hidden while this
          is up, so the whole map is available for the location tap */}
      {isPicking && (
        <div className={styles.pickingBanner}>
          <span className={styles.pickingText}>Tap the map to set the location</span>
          <button className={styles.pickingCancel} onClick={() => setIsPicking(false)}>
            Cancel
          </button>
        </div>
      )}

      {/* D8: ALL top-level controls live in the bottom bar; hidden while
          picking coordinates so it can't swallow location taps in the
          bottom strip (the editor sheet hides itself the same way). */}
      {!isPicking && (
        <BottomBar
          currentCity={currentCity}
          toursCount={toursCount}
          editCount={editCount}
          onOpenSearch={() => setIsSearchOpen(true)}
          onShowTours={() => setIsBottomSheetOpen(true)}
          onAddPlace={handleAddPoi}
          onExport={() => exportMergedPois(poisData)}
        />
      )}

      {/* Expanded search sheet: POI search + city switching (D8) */}
      <SearchSheet
        isOpen={isSearchOpen}
        poisData={poisData}
        currentCity={currentCity}
        onSelectPoi={(poi) => setSelectedPoi({ id: poi.id })}
        onSelectCity={handleCitySelect}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* POI add/edit sheet */}
      <PoiEditorSheet
        session={editorSession}
        poisData={poisData}
        isBasePoi={isBasePoi}
        hasEdit={hasEdit}
        isPicking={isPicking}
        pickedCoordinates={pickedCoordinates}
        onStartPicking={() => {
          // Close any open popup so it can't sit over (and swallow) the
          // location tap; after save the POI gets re-selected anyway.
          setSelectedPoi(null);
          setIsPicking(true);
        }}
        onSave={handleSavePoi}
        onDelete={deletePoi}
        onReset={resetPoi}
        onClose={handleCloseEditor}
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
