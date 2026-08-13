import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { City, EditRecord } from '../data/types';
import type { EditSummary } from '../hooks/usePoiData';
import { springPop } from '../config/motion';
import { cityDisplayName } from '../utils/text';
import { parseChangeset } from '../data/editChangeset';
import {
  ChevronRightIcon,
  ImportIcon,
  PencilIcon,
  PlusIcon,
  RouteIcon,
  SearchIcon,
  ShareIcon,
  TrashIcon
} from './icons';
import styles from './BottomBar.module.css';

// Phase 5b (D8): the bottom-anchored glass control bar, Apple Maps shape -
// search field + grouped Tours/Add-Place actions + ⋯ overflow menu (home
// of edit management, export/import, and the build stamp). The search
// field here is a BUTTON that opens the full SearchSheet (which owns the
// search logic and city switching); the bar itself holds no search state.

const EDIT_TYPE_ICON: Record<EditSummary['type'], typeof PencilIcon> = {
  override: PencilIcon,
  new: PlusIcon,
  delete: TrashIcon
};

const EDIT_TYPE_LABEL: Record<EditSummary['type'], string> = {
  override: 'Edited',
  new: 'Added',
  delete: 'Deleted'
};

interface BottomBarProps {
  currentCity: City | null;
  /** Tours available in the current city - badge on the Tours button. */
  toursCount: number;
  /** Pending on-device edits - badge on ⋯ and the edits list. */
  editCount: number;
  editSummaries: EditSummary[];
  onOpenSearch: () => void;
  onShowTours: () => void;
  onAddPlace: () => void;
  /** Jump straight to a pending edit's editor sheet (override/new rows). */
  onEditPoi: (poiId: string) => void;
  /** Restore a deleted POI directly, no editor needed (delete rows). */
  onRestorePoi: (poiId: string) => void;
  onExportEdits: () => void;
  onExportFull: () => void;
  onImportEdits: (edits: EditRecord[]) => Promise<{ applied: number; skipped: number }>;
}

const BottomBar = ({
  currentCity,
  toursCount,
  editCount,
  editSummaries,
  onOpenSearch,
  onShowTours,
  onAddPlace,
  onEditPoi,
  onRestorePoi,
  onExportEdits,
  onExportFull,
  onImportEdits
}: BottomBarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const toggleMenu = () => {
    setImportStatus(null); // clear any stale result from a prior open
    setIsMenuOpen((open) => !open);
  };

  const handleEditRowClick = (summary: EditSummary) => {
    setIsMenuOpen(false);
    if (summary.type === 'delete') {
      onRestorePoi(summary.poiId);
    } else {
      onEditPoi(summary.poiId);
    }
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file next time
    if (!file) return;

    try {
      const text = await file.text();
      const changeset = parseChangeset(text);
      const { applied, skipped } = await onImportEdits(changeset.edits);
      const from = changeset.author ? ` from ${changeset.author}` : '';
      const skippedNote = skipped > 0 ? `, ${skipped} skipped (you had a newer edit)` : '';
      setImportStatus(
        applied === 0 && skipped === 0
          ? `Empty changeset${from} - nothing to import.`
          : `Imported ${applied} ${applied === 1 ? 'edit' : 'edits'}${from}${skippedNote}.`
      );
    } catch (err) {
      setImportStatus(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

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
            {editSummaries.length > 0 && (
              <>
                <div className={styles.sectionLabel}>
                  Pending {editCount === 1 ? 'edit' : 'edits'}
                </div>
                {/* A short, scrollable list rather than a full sheet - HIG
                    treatment for a small "recent items" set inside a menu
                    (Files' recents, Settings' notification list). Each row
                    navigates to where the real actions already live (the
                    editor's own "Reset to original") rather than
                    duplicating a second discard control here - one place
                    per action, per the app's existing pattern. */}
                <div className={styles.editsList} role="group" aria-label="Pending edits">
                  {editSummaries.map((summary) => {
                    const TypeIcon = EDIT_TYPE_ICON[summary.type];
                    return (
                      <button
                        key={summary.poiId}
                        role="menuitem"
                        className={styles.editRow}
                        onClick={() => handleEditRowClick(summary)}
                        title={
                          summary.type === 'delete'
                            ? `Restore "${summary.name}"`
                            : `Edit "${summary.name}"`
                        }
                      >
                        <span className={styles.editRowIcon} aria-hidden="true"><TypeIcon size={15} /></span>
                        <span className={styles.editRowText}>
                          <span className={styles.editRowName}>{summary.name}</span>
                          <span className={styles.editRowMeta}>
                            {EDIT_TYPE_LABEL[summary.type]} · {cityDisplayName(summary.cityName)}
                          </span>
                        </span>
                        <span className={styles.editRowChevron} aria-hidden="true"><ChevronRightIcon size={16} /></span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <button
              role="menuitem"
              className={styles.menuItem}
              onClick={() => {
                setIsMenuOpen(false);
                onExportEdits();
              }}
            >
              <span className={styles.menuItemIcon} aria-hidden="true"><ShareIcon size={18} /></span>
              <span>
                <span className={styles.menuItemTitle}>Export my edits</span>
                <span className={styles.menuItemSubtitle}>
                  {editCount > 0
                    ? `Share ${editCount} ${editCount === 1 ? 'edit' : 'edits'} on this device`
                    : 'No edits on this device yet'}
                </span>
              </span>
              {editCount > 0 && <span className={styles.menuBadge}>{editCount}</span>}
            </button>

            <button
              role="menuitem"
              className={styles.menuItem}
              onClick={() => {
                setIsMenuOpen(false);
                onExportFull();
              }}
            >
              <span className={styles.menuItemIcon} aria-hidden="true"><ShareIcon size={18} /></span>
              <span>
                <span className={styles.menuItemTitle}>Export full data</span>
                <span className={styles.menuItemSubtitle}>Complete pois.json snapshot</span>
              </span>
            </button>

            <button
              role="menuitem"
              className={styles.menuItem}
              onClick={() => fileInputRef.current?.click()}
            >
              <span className={styles.menuItemIcon} aria-hidden="true"><ImportIcon size={18} /></span>
              <span>
                <span className={styles.menuItemTitle}>Import edits</span>
                <span className={styles.menuItemSubtitle}>
                  {importStatus ?? "Merge someone else's shared edits file"}
                </span>
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className={styles.hiddenFileInput}
              onChange={handleImportFile}
            />

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
          onClick={toggleMenu}
        >
          ⋯
          {editCount > 0 && <span className={styles.badge}>{editCount}</span>}
        </button>
      </div>
    </div>
  );
};

export default BottomBar;
