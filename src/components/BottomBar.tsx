import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { City } from '../data/types';
import { springPop } from '../config/motion';
import styles from './BottomBar.module.css';

// Phase 5b (D8): the bottom-anchored glass control bar, Apple Maps shape -
// search field + grouped Tours/Add-Place actions + ⋯ overflow menu (home
// of Export POI data and the build stamp). The search field here is a
// BUTTON that opens the full SearchSheet (which owns the search logic and
// city switching); the bar itself holds no search state.

interface BottomBarProps {
  currentCity: City | null;
  /** Tours available in the current city - badge on the Tours button. */
  toursCount: number;
  /** Pending on-device edits - badge on ⋯ and the Export menu item. */
  editCount: number;
  onOpenSearch: () => void;
  onShowTours: () => void;
  onAddPlace: () => void;
  onExport: () => void;
}

// Bar icons as inline SVG line drawings instead of emoji: stroke uses
// `currentColor` (the CSS `color` of the button), so contrast is right in
// both color schemes automatically - emoji ship fixed colors and were
// unreadable on dark glass. 24-unit viewBox, 1.8 stroke, round caps: one
// consistent visual weight across the bar.
const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
} as const;

/** Tour route: start point, S-curved path, end point. */
const RouteIcon = () => (
  <svg {...iconProps}>
    <circle cx="6" cy="19" r="2.5" />
    <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
    <circle cx="18" cy="5" r="2.5" />
  </svg>
);

const PlusIcon = () => (
  <svg {...iconProps}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const SearchIcon = () => (
  <svg {...iconProps} width={16} height={16}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

/** iOS-style share: box with an arrow rising out of it. */
const ShareIcon = () => (
  <svg {...iconProps} width={18} height={18}>
    <path d="M12 3v12M8 6.5 12 3l4 3.5" />
    <path d="M7 10H5.5v10h13V10H17" />
  </svg>
);

const cityDisplayName = (name: string): string => name.split(' (')[0] ?? name;

const BottomBar = ({
  currentCity,
  toursCount,
  editCount,
  onOpenSearch,
  onShowTours,
  onAddPlace,
  onExport
}: BottomBarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Dismiss the menu on any press outside the bar. 'pointerdown' covers
  // mouse and touch in one event (vs the old mousedown+touchstart pair).
  useEffect(() => {
    if (!isMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      // ❓ CONCEPT: `instanceof Node` type guard
      // 📝 EXPLANATION: event.target is typed as the loose EventTarget;
      // the runtime check narrows it so .contains() typechecks - TS's
      // version of isinstance() narrowing.
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setIsMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isMenuOpen]);

  // The search "field" doubles as the passive current-city label D8 asks
  // for: with a city active it reads "Search Munich…".
  const searchLabel = currentCity
    ? `Search ${cityDisplayName(currentCity.name)}…`
    : 'Search places…';

  return (
    <div ref={rootRef} className={styles.root}>
      {/* ⋯ overflow menu popover */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className={`glass glass--elevated ${styles.menu}`}
            role="menu"
            aria-label="More actions"
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={springPop}
          >
            <button
              role="menuitem"
              className={styles.menuItem}
              onClick={() => {
                setIsMenuOpen(false);
                onExport();
              }}
            >
              <span className={styles.menuItemIcon} aria-hidden="true"><ShareIcon /></span>
              <span>
                <span className={styles.menuItemTitle}>Export POI data</span>
                <span className={styles.menuItemSubtitle}>
                  {editCount > 0
                    ? `${editCount} ${editCount === 1 ? 'edit' : 'edits'} on this device`
                    : 'No edits on this device yet'}
                </span>
              </span>
              {editCount > 0 && <span className={styles.menuBadge}>{editCount}</span>}
            </button>
            {/* Build stamp - confirms which deploy is running (vs. a stale
                SW cache). Lived in the old city dropdown; the ⋯ menu is its
                D8 home. */}
            <div className={styles.buildStamp}>
              {__BUILD_SHA__} &middot; {new Date(__BUILD_DATE__).toLocaleDateString()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The bar itself */}
      <div className={`glass ${styles.bar}`}>
        <button className={styles.searchButton} onClick={onOpenSearch}>
          <span className={styles.searchIcon} aria-hidden="true"><SearchIcon /></span>
          <span className={styles.searchLabel}>{searchLabel}</span>
        </button>

        {/* Grouped direct actions (HIG: related actions share one group) */}
        <div className={styles.buttonGroup}>
          <button
            className={styles.groupButton}
            aria-label="Walking tours"
            title="Walking Tours"
            onClick={() => {
              setIsMenuOpen(false);
              onShowTours();
            }}
          >
            <RouteIcon />
            {toursCount > 0 && <span className={styles.badge}>{toursCount}</span>}
          </button>
          <button
            className={styles.groupButton}
            aria-label="Add place"
            title="Add Place"
            onClick={() => {
              setIsMenuOpen(false);
              onAddPlace();
            }}
          >
            <PlusIcon />
          </button>
        </div>

        {/* Overflow - data management & future settings live here (D8) */}
        <button
          className={styles.moreButton}
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          title="More"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          ⋯
          {editCount > 0 && <span className={styles.badge}>{editCount}</span>}
        </button>
      </div>
    </div>
  );
};

export default BottomBar;
