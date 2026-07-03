import { useState } from 'react';

// ❓ CONCEPT: Popup content as a React component
// 📝 EXPLANATION: Previously the popup was a raw HTML string passed to
// mapboxgl's setHTML(), which needed manual quote-escaping and a
// document-level click listener for the "Discover More" toggle. Rendering
// it as a component means React handles escaping and events natively, and
// the content always reflects current state (fixing the walking-tour
// banner that could never appear due to a stale closure).
const POIPopup = ({ poi, tour, onEdit }) => {
  const [expanded, setExpanded] = useState(false);

  const description = poi.description || '';
  const walkingTourNotes = poi.walkingTourNotes || '';
  const hasDiscoverMore = walkingTourNotes.length > 0 || description.length > 120;

  // Show full description if no walking tour notes, otherwise keep it short
  const shortDescription = walkingTourNotes.length > 0
    ? description
    : (description.length > 120 ? description.substring(0, 120) + '...' : description);

  // Content for "Discover More" - walking tour notes take priority
  const discoverContent = walkingTourNotes.length > 0 ? walkingTourNotes : description;

  // Walking tour stop banner - only when this POI is part of the active tour
  const stopIndex = tour ? tour.poiSequence.indexOf(poi.id) : -1;

  const hasNotes = typeof poi.notes === 'string' && poi.notes.trim().length > 0;

  return (
    <div
      style={{
        maxWidth: 'min(300px, 90vw)',
        maxHeight: 'min(400px, 60vh)',
        overflowY: 'auto',
        padding: '8px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        background: 'white',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <h3 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '16px', lineHeight: 1.3 }}>
        {poi.name}
      </h3>

      <div style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#4b5563', lineHeight: 1.4 }}>
        <span>{expanded ? discoverContent : shortDescription}</span>
        {hasDiscoverMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Show less' : 'Discover more'} about ${poi.name}`}
            style={{
              color: '#2563eb',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              textDecoration: 'underline',
              padding: 0,
              marginLeft: '4px'
            }}
          >
            {expanded ? 'Show Less' : 'Discover More'}
          </button>
        )}
      </div>

      {stopIndex >= 0 && (
        <div style={{ background: '#ecfdf5', border: '1px solid #059669', padding: '8px', borderRadius: '4px', marginTop: '8px' }}>
          <strong style={{ color: '#059669' }}>🚶‍♂️ Walking Tour:</strong>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#065f46' }}>
            Stop {stopIndex + 1} of {tour.poiSequence.length} - {tour.name}
          </p>
        </div>
      )}

      {hasNotes && (
        <div style={{ background: '#f3f4f6', padding: '8px', borderRadius: '4px', marginTop: '8px' }}>
          <strong style={{ color: '#059669' }}>📝 Note:</strong>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#374151', lineHeight: 1.3 }}>
            {poi.notes}
          </p>
        </div>
      )}

      {poi.googleMapsUrl && (
        <div style={{ marginTop: '8px' }}>
          <a
            href={poi.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              color: '#2563eb',
              textDecoration: 'none',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🗺️ View on Google Maps
          </a>
        </div>
      )}

      <div
        style={{
          marginTop: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}
      >
        <span style={{ fontSize: '12px', color: '#6b7280' }}>📍 {poi.category}</span>
        {onEdit && (
          <button
            onClick={() => onEdit(poi)}
            aria-label={`Edit ${poi.name}`}
            style={{
              color: '#2563eb',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px 10px'
            }}
          >
            ✏️ Edit
          </button>
        )}
      </div>
    </div>
  );
};

export default POIPopup;
