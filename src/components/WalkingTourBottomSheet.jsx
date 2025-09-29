import poisData from '../data/pois.json';

const WalkingTourBottomSheet = ({ currentCity, onTourSelect, selectedTour }) => {
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
      {/* City Info Header */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h3 style={{
          margin: '0 0 8px 0',
          color: '#1f2937',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          🚶‍♂️ Walking Tours in {currentCity.name}
        </h3>
        <p style={{
          margin: 0,
          color: '#6b7280',
          fontSize: '14px'
        }}>
          Discover the city's highlights on foot
        </p>
      </div>

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
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectedTour?.id === tour.id
                ? '0 4px 12px rgba(37, 99, 235, 0.15)'
                : '0 2px 4px rgba(0, 0, 0, 0.05)'
            }}
            onClick={() => {
              onTourSelect(selectedTour?.id === tour.id ? null : tour);
            }}
            onMouseEnter={(e) => {
              if (selectedTour?.id !== tour.id) {
                e.target.style.backgroundColor = '#f9fafb';
                e.target.style.borderColor = '#d1d5db';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedTour?.id !== tour.id) {
                e.target.style.backgroundColor = 'white';
                e.target.style.borderColor = '#e5e7eb';
              }
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
                {selectedTour?.id === tour.id ? '✅' : '🗺️'} {tour.name}
              </h4>
              <div style={{
                backgroundColor: selectedTour?.id === tour.id ? '#2563eb' : '#6b7280',
                color: 'white',
                fontSize: '12px',
                fontWeight: '500',
                padding: '4px 8px',
                borderRadius: '12px'
              }}>
                {tour.difficulty}
              </div>
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

            {/* Action Hint */}
            {selectedTour?.id === tour.id && (
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#0369a1',
                fontWeight: '500'
              }}>
                ✨ Route is now visible on the map! Tap again to hide.
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Clear Selection Button */}
      {selectedTour && (
        <button
          onClick={() => onTourSelect(null)}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#fee2e2';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#fef2f2';
          }}
        >
          ✕ Clear Walking Tour
        </button>
      )}
    </div>
  );
};

export default WalkingTourBottomSheet;