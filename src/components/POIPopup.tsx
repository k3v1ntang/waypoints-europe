import { useState } from 'react';
import ImageLightbox from './ImageLightbox';
import type { Poi, WalkingTour } from '../data/types';
import styles from './POIPopup.module.css';

// ❓ CONCEPT: Popup content as a React component
// 📝 EXPLANATION: the popup DOM node is created and positioned by MapLibre,
// but its CONTENT is a React root rendering this component (see Map.tsx),
// so it always reflects current state - no stale closures, no manual
// escaping. Phase 5b: the card is a true glass surface (D4: small floating
// card over the map), styled via tokens so dark mode comes for free.

interface POIPopupProps {
  poi: Poi;
  tour: WalkingTour | null;
  onEdit?: (poi: Poi) => void;
}

const iconProps = {
  width: 13,
  height: 13,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
} as const;

const PinIcon = () => (
  <svg {...iconProps}>
    <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const PencilIcon = () => (
  <svg {...iconProps}>
    <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
  </svg>
);

/** Outward arrow in a corner - external link. */
const ExternalIcon = () => (
  <svg {...iconProps}>
    <path d="M14 4h6v6" />
    <path d="M20 4 10 14" />
    <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
  </svg>
);

const POIPopup = ({ poi, tour, onEdit }: POIPopupProps) => {
  const [expanded, setExpanded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const photos = Array.isArray(poi.photos) ? poi.photos : [];
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
    <div className={`glass ${styles.card}`}>
      <h3 className={styles.name}>{poi.name}</h3>

      <div className={styles.description}>
        <span>{expanded ? discoverContent : shortDescription}</span>
        {hasDiscoverMore && (
          <button
            className={styles.discoverMore}
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Show less' : 'Discover more'} about ${poi.name}`}
          >
            {expanded ? 'Show Less' : 'Discover More'}
          </button>
        )}
      </div>

      {photos.length > 0 && (
        <div className={styles.photoStrip}>
          {photos.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={`${poi.name} photo ${i + 1}`}
              onClick={() => setLightboxIndex(i)}
              loading="lazy"
              className={styles.photo}
            />
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <ImageLightbox
          isOpen={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
          slides={photos.map((src) => ({ src, alt: poi.name }))}
          index={lightboxIndex ?? 0}
        />
      )}

      {tour && stopIndex >= 0 && (
        <div className={styles.tourBanner}>
          <span className={styles.tourBannerTitle}>Walking Tour</span>
          <p className={styles.tourBannerText}>
            Stop {stopIndex + 1} of {tour.poiSequence.length} - {tour.name}
          </p>
        </div>
      )}

      {hasNotes && (
        <div className={styles.noteBox}>
          <span className={styles.noteTitle}>Note</span>
          <p className={styles.noteText}>{poi.notes}</p>
        </div>
      )}

      {poi.googleMapsUrl && (
        <div className={styles.mapsLink}>
          <a href={poi.googleMapsUrl} target="_blank" rel="noreferrer">
            <ExternalIcon />
            View on Google Maps
          </a>
        </div>
      )}

      <div className={styles.footer}>
        <span className={styles.category}>
          <PinIcon />
          {poi.category}
        </span>
        {onEdit && (
          <button
            className={styles.editButton}
            onClick={() => onEdit(poi)}
            aria-label={`Edit ${poi.name}`}
          >
            <PencilIcon />
            Edit
          </button>
        )}
      </div>
    </div>
  );
};

export default POIPopup;
