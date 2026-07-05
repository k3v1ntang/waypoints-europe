import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { City } from '../data/types';
import { springPop } from '../config/motion';
import { cityDisplayName } from '../utils/text';
import { PlusIcon, RouteIcon, SearchIcon, ShareIcon } from './icons';
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
  // for: with a city active it reads "Search Munich…". Before any city is
  // chosen it advertises the sheet's real first job - picking a city -
  // since this is the app's starting point.
  const searchLabel = currentCity
    ? `Search ${cityDisplayName(currentCity.name)}…`
    : 'Find a city or place…';

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
              <span className={styles.menuItemIcon} aria-hidden="true"><ShareIcon size={18} /></span>
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
          <span className={styles.searchIcon} aria-hidden="true"><SearchIcon size={16} /></span>
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
