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
    

    // Wait for map to load, then add POI markers
    map.on('load', () => {
      // Add POI markers for each city
      poisData.cities.forEach(city => {
        city.pois.forEach(poi => {
          // Create marker element
          const markerElement = document.createElement('div');
          markerElement.className = 'poi-marker';
          markerElement.style.cssText = `
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background-color: #2563eb;
            border: 2px solid white;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          `;

          // Create popup with POI information - follows 2025 mobile UX best practices
          const popup = new mapboxgl.Popup({
            offset: 25,
            closeButton: false,
            closeOnClick: true  // Enable click-away to close for better mobile UX
          }).setHTML(`
            <div style="max-width: 250px;">
              <h3 style="margin: 0 0 8px 0; color: #1f2937;">${poi.name}</h3>
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #4b5563;">${poi.description}</p>
              <div style="background: #f3f4f6; padding: 8px; border-radius: 4px; margin-top: 8px;">
                <strong style="color: #059669;">💡 Tip:</strong>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #374151;">${poi.tips}</p>
              </div>
              ${poi.googleMapsUrl ? `<div style="margin-top: 8px;">
                <a href="${poi.googleMapsUrl}" target="_blank" style="color: #2563eb; text-decoration: none; font-size: 13px; display: inline-flex; align-items: center; gap: 4px;">
                  🗺️ View on Google Maps
                </a>
              </div>` : ''}
              <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
                ⏱️ ${poi.estimatedDuration} • 📍 ${poi.category}
              </div>
            </div>
          `);

          // Add marker to map
          new mapboxgl.Marker(markerElement)
            .setLngLat(poi.coordinates)
            .setPopup(popup)
            .addTo(map);
        });
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
          width: '100vw'
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