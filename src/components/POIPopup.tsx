import { useState } from 'react';
import ImageLightbox from './ImageLightbox';
import type { Poi, WalkingTour } from '../data/types';
import { CheckIcon, ExternalIcon, PencilIcon, PinIcon } from './icons';
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
  /** D11: primary one-tap "visited" toggle; D6: also the un-mark action, so
   * a visited POI stays reachable and reversible whether or not hide-visited
   * is on. */
  onToggleVisited?: (poi: Poi) => void;
}

const POIPopup = ({ poi, tour, onEdit, onToggleVisited }: POIPopupProps) => {
  const [expanded, setExpanded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const isVisited = poi.visited === true;

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
      {/* Only the text content scrolls; the footer with the two actions
          (Google Maps, Edit) stays pinned - on long POIs they were below
          the fold and easy to miss (on-device finding, 2026-07-05). */}
      <div className={styles.cardBody}>
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

      <div className={styles.metaRow}>
        <span className={styles.category}>
          <PinIcon size={13} />
          {poi.category}
        </span>
        {onToggleVisited && (
          <button
            className={isVisited ? styles.visitedToggleActive : styles.visitedToggle}
            onClick={() => onToggleVisited(poi)}
            aria-pressed={isVisited}
            aria-label={isVisited ? `Mark ${poi.name} as not visited` : `Mark ${poi.name} as visited`}
          >
            <CheckIcon size={13} />
            {isVisited ? 'Visited' : 'Mark visited'}
          </button>
        )}
      </div>
      </div>

      {(poi.googleMapsUrl || onEdit) && (
        <div className={styles.footer}>
          {poi.googleMapsUrl ? (
            <a
              className={styles.mapsLink}
              href={poi.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalIcon size={13} />
              Google Maps
            </a>
          ) : (
            <span />
          )}
          {onEdit && (
            <button
              className={styles.editButton}
              onClick={() => onEdit(poi)}
              aria-label={`Edit ${poi.name}`}
            >
              <PencilIcon size={13} />
              Edit
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default POIPopup;
