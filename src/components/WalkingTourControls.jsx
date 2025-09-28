import { useState } from 'react';
import poisData from '../data/pois.json';

const WalkingTourControls = ({ currentCity, onTourSelect, selectedTour }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Get walking tours for current city
  const getAvailableTours = () => {
    if (!currentCity || !poisData.walkingTours) return [];
    return poisData.walkingTours[currentCity.id] || [];
  };

  const availableTours = getAvailableTours();

  // Don't render if no city selected or no tours available
  if (!currentCity || availableTours.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'absolute',
      top: '80px', // Below city navigation
      left: '16px',
      zIndex: 1000,
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Walking Tour Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '160px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#1d4ed8';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = '#2563eb';
        }}
      >
        🚶‍♂️ Walking Tours
        <span style={{
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }}>▼</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '1px solid #e5e7eb',
          marginTop: '4px',
          overflow: 'hidden',
          minWidth: '300px'
        }}>
          {availableTours.map((tour) => (
            <div
              key={tour.id}
              onClick={() => {
                onTourSelect(selectedTour?.id === tour.id ? null : tour);
                setIsOpen(false);
              }}
              style={{
                padding: '16px',
                borderBottom: '1px solid #f3f4f6',
                cursor: 'pointer',
                background: selectedTour?.id === tour.id ? '#eff6ff' : 'white',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (selectedTour?.id !== tour.id) {
                  e.target.style.background = '#f9fafb';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = selectedTour?.id === tour.id ? '#eff6ff' : 'white';
              }}
            >
              <div style={{
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {selectedTour?.id === tour.id ? '✓' : '🗺️'} {tour.name}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#6b7280',
                marginBottom: '8px'
              }}>
                {tour.description}
              </div>
              <div style={{
                display: 'flex',
                gap: '16px',
                fontSize: '12px',
                color: '#374151'
              }}>
                <span>⏱️ {tour.estimatedTime}</span>
                <span>📏 {tour.distance}</span>
                <span>🎯 {tour.poiSequence.length} stops</span>
              </div>
            </div>
          ))}

          {/* Clear Selection Option */}
          {selectedTour && (
            <div
              onClick={() => {
                onTourSelect(null);
                setIsOpen(false);
              }}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                background: '#fef2f2',
                color: '#dc2626',
                fontSize: '13px',
                fontWeight: '500',
                textAlign: 'center',
                borderTop: '1px solid #fee2e2'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#fecaca';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#fef2f2';
              }}
            >
              ✕ Clear Walking Tour
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WalkingTourControls;