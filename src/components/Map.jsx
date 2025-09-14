import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import poisData from '../data/pois.json';
import CityNavigation from './CityNavigation.jsx';

const Map = () => {
  const mapContainerRef = useRef();
  const mapRef = useRef();
  const [currentCity, setCurrentCity] = useState(null);

  // Function to handle city selection and zoom
  const handleCitySelect = (city) => {
    setCurrentCity(city);
    
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
        
        // Create popup content
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          closeOnClick: true
        }).setLngLat(coordinates)
        .setHTML(`
          <div style="max-width: 250px;">
            <h3 style="margin: 0 0 8px 0; color: #1f2937;">${properties.name}</h3>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #4b5563;">${properties.description}</p>
            <div style="background: #f3f4f6; padding: 8px; border-radius: 4px; margin-top: 8px;">
              <strong style="color: #059669;">📝 Note:</strong>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #374151;">${properties.notes}</p>
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
    </>
  );
};

export default Map;