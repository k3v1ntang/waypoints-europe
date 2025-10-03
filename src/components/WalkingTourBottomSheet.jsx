import { useState } from 'react';
import poisData from '../data/pois.json';
import ImageLightbox from './ImageLightbox';
import GuideViewer from './GuideViewer';

const WalkingTourBottomSheet = ({ currentCity, onTourSelect, selectedTour }) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [activeTour, setActiveTour] = useState(null); // Track which tour's resources are being viewed
  // Get walking tours for current city
  const getAvailableTours = () => {
    if (!currentCity || !poisData.walkingTours) return [];
    return poisData.walkingTours[currentCity.id] || [];
  };

  const availableTours = getAvailableTours();

  if (!currentCity) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
        <h3 style={{ margin: '0 0 8px 0', color: '#6b7280' }}>Select a City</h3>
        <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px' }}>
          Choose a city from the dropdown above to view available walking tours
        </p>
      </div>
    );
  }

  if (availableTours.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚶‍♂️</div>
        <h3 style={{ margin: '0 0 8px 0', color: '#6b7280' }}>No Tours Available</h3>
        <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px' }}>
          Walking tours for {currentCity.name} are coming soon
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Tours List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {availableTours.map((tour) => (
          <div
            key={tour.id}
            style={{
              border: selectedTour?.id === tour.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '16px',
              backgroundColor: selectedTour?.id === tour.id ? '#eff6ff' : 'white',
              transition: 'all 0.2s ease',
              boxShadow: selectedTour?.id === tour.id
                ? '0 4px 12px rgba(37, 99, 235, 0.15)'
                : '0 2px 4px rgba(0, 0, 0, 0.05)'
            }}
          >
            {/* Tour Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <h4 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🗺️ {tour.name}
              </h4>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTourSelect(selectedTour?.id === tour.id ? null : tour);
                }}
                style={{
                  backgroundColor: selectedTour?.id === tour.id ? '#dc2626' : '#2563eb',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '600',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.opacity = '0.9';
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.opacity = '1';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                {selectedTour?.id === tour.id ? '✕ Hide Route' : '📍 Show Route'}
              </button>
            </div>

            {/* Tour Description */}
            <p style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              color: '#4b5563',
              lineHeight: '1.4'
            }}>
              {tour.description}
            </p>

            {/* Tour Stats */}
            <div style={{
              display: 'flex',
              gap: '16px',
              fontSize: '12px',
              color: '#6b7280',
              flexWrap: 'wrap'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                ⏱️ {tour.estimatedTime}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                📏 {tour.distance}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                📍 {tour.poiSequence.length} stops
              </span>
            </div>

            {/* Walking Tour Resources - Show if tour has mapImage */}
            {tour.mapImage && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}>
                {/* Walking Tour Map Section */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <h5 style={{
                      margin: 0,
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      🗺️ Walking Tour Map
                    </h5>
                    <span style={{
                      fontSize: '11px',
                      color: '#64748b',
                      fontStyle: 'italic'
                    }}>
                      Tap to view full size
                    </span>
                  </div>

                  <div
                    onClick={() => {
                      setActiveTour(tour);
                      setIsLightboxOpen(true);
                    }}
                    style={{
                      width: '100%',
                      height: '120px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.02)';
                      e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <img
                      src={tour.mapImage}
                      alt={`${tour.name} Map`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backdropFilter: 'blur(4px)'
                    }}>
                      🔍 View Map
                    </div>
                  </div>
                </div>

                {/* Full Tour Guide Link */}
                <button
                  onClick={() => {
                    setActiveTour(tour);
                    setIsGuideOpen(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f8fafc';
                    e.target.style.borderColor = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'white';
                    e.target.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '16px' }}>📖</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1f2937'
                      }}>
                        View Full Tour Guide
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        Complete walking tour with detailed descriptions
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '18px',
                    color: '#2563eb'
                  }}>
                    →
                  </span>
                </button>
              </div>
            )}

          </div>
        ))}
      </div>


      {/* Image Lightbox */}
      {activeTour && (
        <ImageLightbox
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          imageSrc={activeTour.mapImage}
          imageAlt={`${activeTour.name} Map - Detailed walking tour route with numbered stops`}
          title={`${activeTour.name} Map`}
        />
      )}

      {/* Guide Viewer */}
      {isGuideOpen && (
        <GuideViewer
          cityId={selectedTour?.id}
          onClose={() => setIsGuideOpen(false)}
        />
      )}
    </div>
  );
};

export default WalkingTourBottomSheet;