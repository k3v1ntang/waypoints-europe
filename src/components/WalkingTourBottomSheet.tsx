import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import ImageLightbox from './ImageLightbox';
import GuideViewer from './GuideViewer';
import type { City, WalkingTour } from '../data/types';
import {
  BookIcon,
  ChevronRightIcon,
  ClockIcon,
  CloseIcon,
  DistanceIcon,
  PinIcon
} from './icons';
import styles from './WalkingTourBottomSheet.module.css';

// Phase 5b: tours list content, restyled on the token system. Control
// icons are SVG line drawings (stroke: currentColor) so they track the
// color scheme; the big emoji survive only as empty-state illustrations.

interface WalkingTourBottomSheetProps {
  currentCity: City | null;
  walkingTours: Record<string, WalkingTour[]> | undefined;
  onTourSelect: (tour: WalkingTour | null) => void;
  selectedTour: WalkingTour | null;
}

const WalkingTourBottomSheet = ({
  currentCity,
  walkingTours,
  onTourSelect,
  selectedTour
}: WalkingTourBottomSheetProps) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  // Track which tour's resources (map image / guide) are being viewed
  const [activeTour, setActiveTour] = useState<WalkingTour | null>(null);

  const availableTours = currentCity ? walkingTours?.[currentCity.id] ?? [] : [];

  if (!currentCity) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateArt} aria-hidden="true">🗺️</div>
        <h3 className={styles.emptyStateTitle}>Select a City</h3>
        <p className={styles.emptyStateText}>
          Choose a city from Search below to view available walking tours
        </p>
      </div>
    );
  }

  if (availableTours.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateArt} aria-hidden="true">🚶‍♂️</div>
        <h3 className={styles.emptyStateTitle}>No Tours Available</h3>
        <p className={styles.emptyStateText}>
          Walking tours for {currentCity.name} are coming soon
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.tourList}>
        {availableTours.map((tour) => {
          const isSelected = selectedTour?.id === tour.id;
          return (
            <div key={tour.id} className={isSelected ? styles.tourCardSelected : styles.tourCard}>
              <div className={styles.tourHeader}>
                <h4 className={styles.tourName}>{tour.name}</h4>
                <button
                  className={isSelected ? styles.routeButtonActive : styles.routeButton}
                  onClick={() => onTourSelect(isSelected ? null : tour)}
                >
                  {isSelected ? <CloseIcon size={14} /> : <PinIcon size={14} />}
                  {isSelected ? 'Hide Route' : 'Show Route'}
                </button>
              </div>

              <p className={styles.tourDescription}>{tour.description}</p>

              <div className={styles.tourStats}>
                <span className={styles.tourStat}>
                  <ClockIcon size={14} />
                  {tour.estimatedTime}
                </span>
                <span className={styles.tourStat}>
                  <DistanceIcon size={14} />
                  {tour.distance}
                </span>
                <span className={styles.tourStat}>
                  <PinIcon size={14} />
                  {tour.poiSequence.length} stops
                </span>
              </div>

              {tour.mapImage && (
                <div className={styles.resources}>
                  <div className={styles.resourceLabel}>
                    Walking Tour Map
                    <span className={styles.resourceHint}>Tap to view full size</span>
                  </div>

                  <button
                    className={styles.mapPreview}
                    aria-label={`View ${tour.name} map full size`}
                    onClick={() => {
                      setActiveTour(tour);
                      setIsLightboxOpen(true);
                    }}
                  >
                    <img
                      src={tour.mapImage}
                      alt={`${tour.name} Map`}
                      className={styles.mapPreviewImage}
                      loading="lazy"
                    />
                    <span className={styles.mapPreviewChip}>View Map</span>
                  </button>

                  <button
                    className={styles.guideButton}
                    onClick={() => {
                      setActiveTour(tour);
                      setIsGuideOpen(true);
                    }}
                  >
                    <span className={styles.guideButtonIcon}><BookIcon size={20} /></span>
                    <span className={styles.guideButtonText}>
                      <span className={styles.guideButtonTitle}>View Full Tour Guide</span>
                      <span className={styles.guideButtonSubtitle}>
                        Complete walking tour with detailed descriptions
                      </span>
                    </span>
                    <span className={styles.guideButtonChevron}><ChevronRightIcon size={16} /></span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeTour?.mapImage && (
        <ImageLightbox
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          slides={[
            {
              src: activeTour.mapImage,
              alt: `${activeTour.name} Map - Detailed walking tour route with numbered stops`
            }
          ]}
        />
      )}

      <AnimatePresence>
        {isGuideOpen && activeTour && (
          <GuideViewer tourId={activeTour.id} onClose={() => setIsGuideOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default WalkingTourBottomSheet;
