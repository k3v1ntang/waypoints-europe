import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const Map = () => {
  const mapContainerRef = useRef();
  
  useEffect(() => {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
    
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: [15.0, 54.0], // Europe center to show all travel cities
      zoom: 4, // Appropriate zoom to see Munich to Helsinki range
      style: 'mapbox://styles/mapbox/streets-v12'
    });
    
    return () => map.remove();
  }, []);
  
  return (
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
  );
};

export default Map;