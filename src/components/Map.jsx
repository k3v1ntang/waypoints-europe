import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import poisData from '../data/pois.json';
import CityNavigation from './CityNavigation.jsx';
import WalkingTourControls from './WalkingTourControls.jsx';

const Map = () => {
  const mapContainerRef = useRef();
  const mapRef = useRef();
  const [currentCity, setCurrentCity] = useState(null);
  const [selectedTour, setSelectedTour] = useState(null);

  // Helper function to find POI coordinates by ID
  const findPOICoordinates = (poiId, cityId) => {
    const city = poisData.cities.find(c => c.id === cityId);
    if (!city) return null;
    const poi = city.pois.find(p => p.id === poiId);
    return poi ? poi.coordinates : null;
  };

  // Function to handle walking tour selection
  const handleTourSelect = (tour) => {
    setSelectedTour(tour);

    if (!mapRef.current) return;

    if (tour) {
      // Create direct lines between POIs in sequence
      const coordinates = tour.poiSequence
        .map(poiId => findPOICoordinates(poiId, currentCity.id))
        .filter(coord => coord !== null);

      if (coordinates.length >= 2) {
        // Add or update the tour route source
        if (mapRef.current.getSource('walking-tour-line')) {
          mapRef.current.getSource('walking-tour-line').setData({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: coordinates
            }
          });
        }

        // Fit bounds to show the entire tour
        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach(coord => bounds.extend(coord));
        mapRef.current.fitBounds(bounds, {
          padding: { top: 120, bottom: 50, left: 50, right: 50 },
          duration: 1500
        });
      }
    } else {
      // Clear tour route
      if (mapRef.current.getSource('walking-tour-line')) {
        mapRef.current.getSource('walking-tour-line').setData({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        });
      }
    }
  };

  // Function to handle city selection and zoom
  const handleCitySelect = (city) => {
    setCurrentCity(city);
    setSelectedTour(null); // Clear any selected tour when changing cities
    
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
  
  useEffect(() => {
    // Add event delegation for popup toggle buttons
    const handleToggleClick = (event) => {
      const button = event.target;
      if (!button.classList.contains('popup-toggle-btn')) return;

      const popupId = button.dataset.popupId;
      const fullDescription = button.dataset.fullDescription;
      const textElement = document.getElementById(`${popupId}-text`);

      if (!textElement) return;

      const isExpanded = button.getAttribute('aria-expanded') === 'true';

      if (isExpanded) {
        // Collapse - show truncated text
        const shortDescription = fullDescription.length > 120
          ? fullDescription.substring(0, 120) + '...'
          : fullDescription;
        textElement.textContent = shortDescription;
        button.textContent = 'Read More';
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-label', `Read more about ${button.dataset.poiName}`);
      } else {
        // Expand - show full text
        textElement.textContent = fullDescription;
        button.textContent = 'Read Less';
        button.setAttribute('aria-expanded', 'true');
        button.setAttribute('aria-label', `Read less about ${button.dataset.poiName}`);
      }
    };

    // Add event listener to document for event delegation
    document.addEventListener('click', handleToggleClick);

    // ❓ CONCEPT: Prevent duplicate map initialization
    // 💰 COST IMPACT: Each map initialization = 1 API call
    if (mapRef.current) return;
    
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
    
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: [15.0, 54.0], // Europe center to show all travel cities
      zoom: 4, // Appropriate zoom to see Munich to Helsinki range
      style: 'mapbox://styles/mapbox/streets-v12'
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
      // Convert POI data to GeoJSON format for clustering
      const geojsonData = {
        type: 'FeatureCollection',
        features: []
      };

      poisData.cities.forEach(city => {
        city.pois.forEach(poi => {
          geojsonData.features.push({
            type: 'Feature',
            properties: {
              ...poi,
              cityName: city.name,
              isHotel: poi.category === 'hotel'
            },
            geometry: {
              type: 'Point',
              coordinates: poi.coordinates
            }
          });
        });
      });

      // Add clustered data source
      map.addSource('pois', {
        type: 'geojson',
        data: geojsonData,
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

      // Handle individual point clicks - show popup
      map.on('click', 'unclustered-point', (e) => {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const properties = e.features[0].properties;

        // Check if this POI is part of the current walking tour
        let tourInfo = '';
        if (selectedTour && selectedTour.poiSequence.includes(properties.id)) {
          const stepNumber = selectedTour.poiSequence.indexOf(properties.id) + 1;
          const totalSteps = selectedTour.poiSequence.length;
          tourInfo = `
            <div style="background: #ecfdf5; border: 1px solid #059669; padding: 8px; border-radius: 4px; margin-top: 8px;">
              <strong style="color: #059669;">🚶‍♂️ Walking Tour:</strong>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #065f46;">
                Stop ${stepNumber} of ${totalSteps} - ${selectedTour.name}
              </p>
            </div>
          `;
        }

        // Handle long descriptions with progressive disclosure
        const description = properties.description || '';
        const isLongDescription = description.length > 120;
        const shortDescription = isLongDescription ? description.substring(0, 120) + '...' : description;

        // Generate unique ID for this popup
        const popupId = `popup-${properties.id}-${Date.now()}`;

        // Create popup content with expandable description
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          closeOnClick: true,
          maxWidth: 'none' // Let CSS handle responsive width
        }).setLngLat(coordinates)
        .setHTML(`
          <div style="max-width: min(300px, 90vw); max-height: min(400px, 60vh); overflow-y: auto; padding: 8px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); background: white; -webkit-overflow-scrolling: touch;">
            <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; line-height: 1.3;">${properties.name}</h3>
            <div id="${popupId}-description" style="margin: 0 0 8px 0; font-size: 14px; color: #4b5563; line-height: 1.4;">
              <span id="${popupId}-text">${shortDescription}</span>
              ${isLongDescription ? `
                <button
                  id="${popupId}-toggle"
                  class="popup-toggle-btn"
                  data-popup-id="${popupId}"
                  data-full-description="${description.replace(/"/g, '&quot;')}"
                  data-poi-name="${properties.name}"
                  style="color: #2563eb; background: none; border: none; cursor: pointer; font-size: 13px; text-decoration: underline; padding: 0; margin-left: 4px;"
                  aria-label="Read more about ${properties.name}"
                  aria-expanded="false"
                >
                  Read More
                </button>
              ` : ''}
            </div>
            ${tourInfo}
            <div style="background: #f3f4f6; padding: 8px; border-radius: 4px; margin-top: 8px;">
              <strong style="color: #059669;">📝 Note:</strong>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #374151; line-height: 1.3;">${properties.notes}</p>
            </div>
            ${properties.googleMapsUrl ? `<div style="margin-top: 8px;">
              <a href="${properties.googleMapsUrl}" target="_blank" style="color: #2563eb; text-decoration: none; font-size: 13px; display: inline-flex; align-items: center; gap: 4px;">
                🗺️ View on Google Maps
              </a>
            </div>` : ''}
            <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
              ⏱️ ${properties.estimatedDuration} • 📍 ${properties.category}
            </div>
          </div>
        `)
        .addTo(map);
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
    });
    
    // Store map reference to prevent duplicate initialization
    mapRef.current = map;
    
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      // Clean up event listener
      document.removeEventListener('click', handleToggleClick);
    };
  }, []);
  
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
          height: '100vh', 
          width: '100vw',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }} 
      />
      
      {/* City Navigation Dropdown */}
      <CityNavigation
        onCitySelect={handleCitySelect}
        currentCity={currentCity}
      />

      {/* Walking Tour Controls */}
      <WalkingTourControls
        currentCity={currentCity}
        onTourSelect={handleTourSelect}
        selectedTour={selectedTour}
      />
    </>
  );
};

export default Map;