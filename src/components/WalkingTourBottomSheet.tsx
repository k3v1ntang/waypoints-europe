import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import ImageLightbox from './ImageLightbox';
import GuideViewer from './GuideViewer';
import type { City, WalkingTour } from '../data/types';
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

const iconProps = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
} as const;

const ClockIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

/** Distance: two end points joined by a line. */
const DistanceIcon = () => (
  <svg {...iconProps}>
    <circle cx="5" cy="19" r="2" />
    <circle cx="19" cy="5" r="2" />
    <path d="m6.5 17.5 11-11" />
  </svg>
);

const PinIcon = () => (
  <svg {...iconProps}>
    <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const CloseIcon = () => (
  <svg {...iconProps}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

const BookIcon = () => (
  <svg {...iconProps} width={20} height={20}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg {...iconProps} width={16} height={16}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

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
                  {isSelected ? <CloseIcon /> : <PinIcon />}
                  {isSelected ? 'Hide Route' : 'Show Route'}
                </button>
              </div>

              <p className={styles.tourDescription}>{tour.description}</p>

              <div className={styles.tourStats}>
                <span className={styles.tourStat}>
                  <ClockIcon />
                  {tour.estimatedTime}
                </span>
                <span className={styles.tourStat}>
                  <DistanceIcon />
                  {tour.distance}
                </span>
                <span className={styles.tourStat}>
                  <PinIcon />
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
                    <span className={styles.guideButtonIcon}><BookIcon /></span>
                    <span className={styles.guideButtonText}>
                      <span className={styles.guideButtonTitle}>View Full Tour Guide</span>
                      <span className={styles.guideButtonSubtitle}>
                        Complete walking tour with detailed descriptions
                      </span>
                    </span>
                    <span className={styles.guideButtonChevron}><ChevronRightIcon /></span>
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
