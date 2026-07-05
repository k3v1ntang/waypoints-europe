import { useState, useMemo, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { VALID_CATEGORIES, getPoiErrors } from '../data/poiValidation';
import { generatePoiId } from '../data/mergePois';
import type { Category, Poi, PoisData } from '../data/types';
import { springSheet } from '../config/motion';
import { useEscapeKey } from '../hooks/useSheetDismiss';
import { LocateIcon, MapTapIcon, PinIcon } from './icons';
import styles from './PoiEditorSheet.module.css';

// Bottom sheet for adding / editing a POI (Phase 2, glass restyle Phase 5b).
// Deliberately does NOT reuse BottomSheet: that component unmounts its
// children when closed, but this sheet must keep the form draft alive while
// it is visually hidden during "tap on map" coordinate picking. It stays
// mounted whenever a session is open and only slides off-screen while
// picking.
//
// Coordinates are handled as [lng, lat] throughout (MapLibre format); they
// are only flipped to "lat, lng" for display and for the generated Google
// Maps fallback URL.

export interface EditorSession {
  /** null poi = add a new place. */
  poi: Poi | null;
  cityId: string | null;
}

interface PoiEditorSheetProps {
  session: EditorSession | null;
  poisData: PoisData;
  isBasePoi: (poiId: string) => boolean;
  hasEdit: (poiId: string) => boolean;
  isPicking: boolean;
  /** [lng, lat] set by Map after a tap-on-map pick. */
  pickedCoordinates: [number, number] | null;
  onStartPicking: () => void;
  onSave: (poi: Poi, cityId: string) => Promise<void>;
  onDelete: (poiId: string, cityId: string) => Promise<void>;
  onReset: (poiId: string) => Promise<void>;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<Category, string> = {
  landmark: 'Landmark',
  culture: 'Culture',
  food: 'Food',
  practical: 'Practical',
  hotel: 'Hotel'
};

interface Draft {
  name: string;
  description: string;
  notes: string;
  category: Category;
  googleMapsUrl: string;
  coordinates: [number, number] | null;
}

const emptyDraft: Draft = {
  name: '',
  description: '',
  notes: '',
  category: 'food', // most likely category for POIs added mid-trip
  googleMapsUrl: '',
  coordinates: null
};

const draftFromPoi = (poi: Poi): Draft => ({
  name: poi.name ?? '',
  description: poi.description ?? '',
  notes: poi.notes ?? '',
  category: poi.category ?? 'landmark',
  googleMapsUrl: poi.googleMapsUrl ?? '',
  coordinates: poi.coordinates ?? null
});

// Inner form: mounted while an editing session is open, so per-session
// state (the draft) initializes in useState instead of a sync-from-props
// effect - the pattern React's lint rules push toward.
const EditorBody = ({
  session,
  poisData,
  isBasePoi,
  hasEdit,
  isPicking,
  pickedCoordinates,
  onStartPicking,
  onSave,
  onDelete,
  onReset,
  onClose
}: PoiEditorSheetProps & { session: EditorSession }) => {
  const editingPoi = session.poi;
  const isNew = !editingPoi;

  const [draft, setDraft] = useState<Draft>(() =>
    editingPoi ? draftFromPoi(editingPoi) : emptyDraft
  );
  const [cityId, setCityId] = useState<string | null>(session.cityId);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Apply coordinates picked on the map (the sheet was hidden meanwhile).
  // ❓ CONCEPT: adjusting state during render
  // 📝 EXPLANATION: instead of an effect that runs AFTER the render commits
  // and sets state (causing a second pass anyway, and tripping the
  // set-state-in-effect lint rule), React's documented pattern is to
  // compare the prop against its remembered previous value inline and set
  // state mid-render - React restarts the render immediately with the new
  // state, before touching the DOM.
  const [lastPicked, setLastPicked] = useState(pickedCoordinates);
  if (pickedCoordinates !== lastPicked) {
    setLastPicked(pickedCoordinates);
    if (pickedCoordinates) {
      setDraft((prev) => ({ ...prev, coordinates: pickedCoordinates }));
      setErrors([]);
    }
  }

  // Escape cancels (only while the form is actually visible).
  useEscapeKey(onClose, !isPicking);

  const setField =
    (field: 'name' | 'description' | 'notes' | 'googleMapsUrl') =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setDraft((prev) => ({ ...prev, [field]: value }));
    };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setErrors(['Geolocation is not available on this device.']);
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setDraft((prev) => ({
          ...prev,
          coordinates: [position.coords.longitude, position.coords.latitude]
        }));
        setErrors([]);
      },
      (err) => {
        setIsLocating(false);
        setErrors([`Could not get your location: ${err.message}`]);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // POIs that are stops on a walking tour must not be deleted - the tour's
  // poiSequence would dangle (and fail validation on export).
  // Memoized: this scans every tour's sequence, and the form re-renders on
  // every keystroke (review finding).
  const tourUsingPoi = useMemo(
    () =>
      editingPoi
        ? Object.values(poisData.walkingTours ?? {})
            .flat()
            .find((tour) => tour.poiSequence.includes(editingPoi.id))
        : null,
    [poisData, editingPoi]
  );

  const buildPoi = (): Poi => {
    const trimmedName = draft.name.trim();
    const [lng, lat] = draft.coordinates ?? [];
    return {
      // Preserve fields the form doesn't edit (walkingTourNotes, photos,
      // visibility) by building on top of the original POI.
      ...(editingPoi ?? { photos: [], visibility: 'always' as const }),
      id: editingPoi?.id ?? generatePoiId(trimmedName, cityId ?? '', poisData),
      name: trimmedName,
      // Missing coordinates are caught by validation before this object
      // is ever saved; the cast just bridges the draft's nullable field.
      coordinates: draft.coordinates as [number, number],
      category: draft.category,
      description: draft.description.trim(),
      notes: draft.notes.trim(),
      googleMapsUrl:
        draft.googleMapsUrl.trim() ||
        // Fallback keeps the required-field validation satisfied and is a
        // genuinely useful link. Google Maps URLs take "lat,lng" order.
        (draft.coordinates ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : '')
    };
  };

  const handleSave = async () => {
    const problems: string[] = [];
    if (!draft.coordinates) {
      problems.push('Set a location — tap on the map or use your current location.');
    }
    if (isNew && !cityId) {
      problems.push('Choose which city this place belongs to.');
    }
    const poi = buildPoi();
    // Report every field problem in one pass. When the location is missing,
    // the friendly message above already covers it, so drop the technical
    // coordinate error and the googleMapsUrl one (its fallback is generated
    // from the coordinates once they exist).
    problems.push(
      ...getPoiErrors(poi).filter(
        (e) => draft.coordinates || !(e.includes('coordinates') || e.includes('googleMapsUrl'))
      )
    );
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    setIsSaving(true);
    try {
      // cityId is guaranteed non-null here: the isNew check above blocks
      // missing cities, and editing sessions always carry their city.
      await onSave(poi, cityId as string);
      onClose();
    } catch (err) {
      setErrors([`Saving failed: ${err instanceof Error ? err.message : String(err)}`]);
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingPoi || tourUsingPoi) return;
    const verb = isBasePoi(editingPoi.id) ? 'Hide' : 'Delete';
    if (!window.confirm(`${verb} "${editingPoi.name}"? You can restore it later by exporting and re-editing, but not from the app.`)) return;
    try {
      await onDelete(editingPoi.id, cityId as string);
      onClose();
    } catch (err) {
      setErrors([`Deleting failed: ${err instanceof Error ? err.message : String(err)}`]);
    }
  };

  const handleReset = async () => {
    if (!editingPoi) return;
    if (!window.confirm(`Discard your changes to "${editingPoi.name}" and restore the original?`)) return;
    try {
      await onReset(editingPoi.id);
      onClose();
    } catch (err) {
      setErrors([`Reset failed: ${err instanceof Error ? err.message : String(err)}`]);
    }
  };

  const cityName = (id: string | null) =>
    poisData.cities.find((c) => c.id === id)?.name ?? id;
  const [lng, lat] = draft.coordinates ?? [];

  return (
    <>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {isNew ? 'Add Place' : `Edit ${editingPoi.name}`}
        </h2>
      </div>

      <div className={styles.content}>
        {isNew ? (
          <>
            <label className={styles.label} htmlFor="poi-city">City</label>
            <select
              id="poi-city"
              className={styles.field}
              value={cityId ?? ''}
              onChange={(e) => setCityId(e.target.value || null)}
            >
              <option value="" disabled>Choose a city…</option>
              {poisData.cities.map((city) => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
          </>
        ) : (
          <div className={styles.cityNote}>
            <PinIcon size={13} />
            {cityName(cityId)}
          </div>
        )}

        <label className={styles.label} htmlFor="poi-name">Name</label>
        <input
          id="poi-name"
          type="text"
          className={styles.field}
          value={draft.name}
          onChange={setField('name')}
          placeholder="e.g. Café de Klos"
        />

        <label className={styles.label} htmlFor="poi-category">Category</label>
        <select
          id="poi-category"
          className={styles.field}
          value={draft.category}
          onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value as Category }))}
        >
          {VALID_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category] ?? category}
            </option>
          ))}
        </select>

        <span className={styles.label}>Location</span>
        <div className={styles.locationBox}>
          <div className={draft.coordinates ? styles.locationValue : styles.locationValueEmpty}>
            {draft.coordinates
              ? `${lat?.toFixed(6)}, ${lng?.toFixed(6)}`
              : 'No location set yet'}
          </div>
          <div className={styles.locationButtons}>
            <button className={styles.locationButton} onClick={onStartPicking}>
              <MapTapIcon size={15} />
              Tap on map
            </button>
            <button
              className={styles.locationButton}
              onClick={handleUseMyLocation}
              disabled={isLocating}
            >
              <LocateIcon size={15} />
              {isLocating ? 'Locating…' : 'My location'}
            </button>
          </div>
        </div>

        <label className={styles.label} htmlFor="poi-description">Description</label>
        <textarea
          id="poi-description"
          className={styles.fieldMultiline}
          value={draft.description}
          onChange={setField('description')}
          placeholder="What is this place?"
          rows={3}
        />

        <label className={styles.label} htmlFor="poi-notes">
          Notes <span className={styles.labelHint}>(optional — hours, prices, tips)</span>
        </label>
        <textarea
          id="poi-notes"
          className={styles.fieldMultiline}
          value={draft.notes}
          onChange={setField('notes')}
          placeholder="e.g. Open until 22:00, cash only"
          rows={2}
        />

        <label className={styles.label} htmlFor="poi-gmaps">
          Google Maps link <span className={styles.labelHint}>(optional — generated from location if empty)</span>
        </label>
        <input
          id="poi-gmaps"
          type="url"
          inputMode="url"
          className={styles.field}
          value={draft.googleMapsUrl}
          onChange={setField('googleMapsUrl')}
          placeholder="https://maps.app.goo.gl/…"
        />

        {errors.length > 0 && (
          <div className={styles.errorBox}>
            {errors.map((error, i) => (
              <div key={i} className={styles.errorLine}>⚠️ {error}</div>
            ))}
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.saveButton} onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {!isNew && (
          <div className={styles.dangerZone}>
            {isBasePoi(editingPoi.id) && hasEdit(editingPoi.id) && (
              <button className={styles.textButton} onClick={handleReset}>
                Reset to original
              </button>
            )}
            {tourUsingPoi ? (
              <div className={styles.tourLockNote}>
                This place is a stop on “{tourUsingPoi.name}” and can’t be deleted.
              </div>
            ) : (
              <button className={styles.textButtonDanger} onClick={handleDelete}>
                {isBasePoi(editingPoi.id) ? 'Hide this place' : 'Delete this place'}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

const PoiEditorSheet = (props: PoiEditorSheetProps) => {
  const { session, isPicking } = props;
  return (
    <AnimatePresence>
      {session && (
        <>
          {/* Backdrop - intentionally does NOT close on tap: an accidental
              tap must not throw away a half-typed draft. Faded out (and made
              tap-through) while picking so the map is fully interactive. */}
          <motion.div
            key="editor-backdrop"
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: isPicking ? 0 : 1 }}
            exit={{ opacity: 0 }}
            style={{ pointerEvents: isPicking ? 'none' : 'auto' }}
          />
          <motion.div
            key="editor-sheet"
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label={session.poi ? `Edit ${session.poi.name}` : 'Add place'}
            initial={{ y: '100%' }}
            // Slides fully off-screen (but stays mounted, draft intact)
            // while the user taps the map to pick coordinates.
            animate={{ y: isPicking ? '110%' : 0 }}
            exit={{ y: '100%' }}
            transition={springSheet}
          >
            <EditorBody {...props} session={session} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PoiEditorSheet;
