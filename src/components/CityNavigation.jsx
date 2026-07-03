import { useState, useRef, useEffect } from 'react';
import { colors } from '../config/theme.js';

/**
 * Modern City Navigation Dropdown Component
 * 
 * Following 2025 mobile UI/UX best practices:
 * - Top-left positioning for thumb accessibility
 * - Progressive disclosure (show only what's needed)
 * - Touch-friendly 44px+ hit targets
 * - Clean visual hierarchy with smooth animations
 * - Click outside to close functionality
 */

const CityNavigation = ({ cities, onCitySelect, currentCity = null, editCount = 0, onExport }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside (modern UX pattern)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);


  const handleCityClick = (city) => {
    setIsOpen(false);
    if (onCitySelect) {
      onCitySelect(city);
    }
  };

  // Sort cities by travel itinerary order; cities not in the list (e.g.
  // newly added trip destinations) go to the end in data order.
  const itineraryOrder = ['munich', 'helsinki', 'tallinn', 'stockholm', 'copenhagen', 'malmo'];
  const orderIndex = (city) => {
    const index = itineraryOrder.indexOf(city.id);
    return index === -1 ? itineraryOrder.length : index;
  };
  const sortedCities = [...cities].sort((a, b) => orderIndex(a) - orderIndex(b));

  const displayName = currentCity ? currentCity.name.split(' (')[0] : 'Waypoints';

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 1000,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* Main Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          minWidth: '140px',
          minHeight: '44px', // Touch-friendly minimum size
          transition: 'all 0.2s ease',
          transform: isOpen ? 'scale(0.98)' : 'scale(1)',
          ':hover': {
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)'
          }
        }}
        onMouseEnter={(e) => {
          e.target.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        }}
      >
        <span style={{ flex: 1, textAlign: 'left' }}>
          {displayName}
        </span>
        {/* Modern chevron with rotation animation */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        >
          <path
            d="M6 9L12 15L18 9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            marginTop: '8px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            border: '1px solid #e5e7eb',
            minWidth: '220px',
            overflow: 'hidden',
            // Smooth entry animation
            animation: 'fadeInUp 0.2s ease-out',
            transformOrigin: 'top left'
          }}
        >
          {/* All Cities Overview Option */}
          <button
            onClick={() => handleCityClick(null)}
            style={{
              width: '100%',
              padding: '16px 20px',
              border: 'none',
              backgroundColor: !currentCity ? colors.primary : 'transparent',
              color: !currentCity ? 'white' : '#374151',
              fontSize: '15px',
              fontWeight: !currentCity ? '600' : '500',
              textAlign: 'left',
              cursor: 'pointer',
              borderBottom: '1px solid #f3f4f6',
              transition: 'all 0.15s ease',
              ':hover': {
                backgroundColor: !currentCity ? colors.primary : '#f9fafb'
              }
            }}
            onMouseEnter={(e) => {
              if (!currentCity) return;
              e.target.style.backgroundColor = '#f9fafb';
            }}
            onMouseLeave={(e) => {
              if (!currentCity) return;
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '16px' }}>🌍</span>
              <div>
                <div style={{ fontWeight: '600' }}>All Cities</div>
                <div style={{ 
                  fontSize: '13px', 
                  color: !currentCity ? 'rgba(255,255,255,0.8)' : '#6b7280',
                  marginTop: '2px'
                }}>
                  View complete map
                </div>
              </div>
            </div>
          </button>

          {/* Individual Cities */}
          {sortedCities.map((city) => (
            <button
              key={city.id}
              onClick={() => handleCityClick(city)}
              style={{
                width: '100%',
                padding: '16px 20px',
                border: 'none',
                backgroundColor: currentCity?.id === city.id ? colors.primary : 'transparent',
                color: currentCity?.id === city.id ? 'white' : '#374151',
                fontSize: '15px',
                fontWeight: currentCity?.id === city.id ? '600' : '500',
                textAlign: 'left',
                cursor: 'pointer',
                borderBottom: '1px solid #f3f4f6',
                transition: 'all 0.15s ease',
                ':hover': {
                  backgroundColor: currentCity?.id === city.id ? colors.primary : '#f9fafb'
                }
              }}
              onMouseEnter={(e) => {
                if (currentCity?.id === city.id) return;
                e.target.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                if (currentCity?.id === city.id) return;
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '16px' }}>
                  {city.countryCode === 'DE' ? '🇩🇪' :
                   city.countryCode === 'FI' ? '🇫🇮' :
                   city.countryCode === 'EE' ? '🇪🇪' :
                   city.countryCode === 'SE' ? '🇸🇪' :
                   city.countryCode === 'DK' ? '🇩🇰' : '📍'}
                </span>
                <div>
                  <div style={{ fontWeight: '600' }}>
                    {city.name}
                  </div>
                  <div style={{ 
                    fontSize: '13px', 
                    color: currentCity?.id === city.id ? 'rgba(255,255,255,0.8)' : '#6b7280',
                    marginTop: '2px'
                  }}>
                    {city.pois.length} {city.pois.length === 1 ? 'location' : 'locations'}
                  </div>
                </div>
              </div>
            </button>
          ))}

          {/* Export merged POI data (bundled data + on-device edits) via the
              share sheet - doubles as the mid-trip backup (AirDrop to iPad) */}
          {onExport && (
            <button
              onClick={() => {
                setIsOpen(false);
                onExport();
              }}
              style={{
                width: '100%',
                padding: '14px 20px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500',
                textAlign: 'left',
                cursor: 'pointer',
                borderTop: '1px solid #f3f4f6'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '16px' }}>📤</span>
                <div>
                  <div style={{ fontWeight: '600' }}>Export POI data</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    {editCount > 0
                      ? `${editCount} ${editCount === 1 ? 'edit' : 'edits'} on this device`
                      : 'No edits on this device yet'}
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* Build stamp - confirms which deploy is running (vs. a stale SW cache) */}
          <div
            style={{
              padding: '8px 20px',
              fontSize: '11px',
              color: '#9ca3af',
              textAlign: 'left',
              borderTop: '1px solid #f3f4f6'
            }}
          >
            {__BUILD_SHA__} &middot; {new Date(__BUILD_DATE__).toLocaleDateString()}
          </div>
        </div>
      )}

      {/* CSS Animation for dropdown entrance */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default CityNavigation;