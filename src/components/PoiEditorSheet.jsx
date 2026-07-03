import { useState, useEffect } from 'react';
import { colors } from '../config/theme.js';
import { VALID_CATEGORIES, getPoiErrors } from '../data/poiValidation.js';
import { generatePoiId } from '../data/mergePois.js';

// Bottom sheet for adding / editing a POI (Phase 2). Deliberately does NOT
// reuse BottomSheet.jsx: that component unmounts its children when closed,
// but this sheet must keep the form draft alive while it is visually hidden
// during "tap on map" coordinate picking. It stays mounted whenever a
// session is open and only translates off-screen while picking.
//
// Coordinates are handled as [lng, lat] throughout (Mapbox format); they
// are only flipped to "lat, lng" for display and for the generated Google
// Maps fallback URL.

const CATEGORY_LABELS = {
  landmark: '🏛️ Landmark',
  culture: '🎭 Culture',
  food: '🍽️ Food',
  practical: '🧭 Practical',
  hotel: '🏨 Hotel'
};

const emptyDraft = {
  name: '',
  description: '',
  notes: '',
  category: 'food', // most likely category for POIs added mid-trip
  googleMapsUrl: '',
  coordinates: null
};

const draftFromPoi = (poi) => ({
  name: poi.name ?? '',
  description: poi.description ?? '',
  notes: poi.notes ?? '',
  category: poi.category ?? 'landmark',
  googleMapsUrl: poi.googleMapsUrl ?? '',
  coordinates: poi.coordinates ?? null
});

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '16px', // 16px minimum prevents iOS Safari from zooming on focus
  color: '#1f2937',
  backgroundColor: 'white',
  fontFamily: 'inherit'
};

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
  margin: '14px 0 6px 0'
};

const secondaryButtonStyle = {
  backgroundColor: '#f3f4f6',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer'
};

const PoiEditorSheet = ({
  session, // { poi: object | null (null = add new), cityId: string | null }
  poisData,
  isBasePoi,
  hasEdit,
  isPicking,
  pickedCoordinates, // [lng, lat] set by Map after a tap-on-map pick
  onStartPicking,
  onSave,
  onDelete,
  onReset,
  onClose
}) => {
  const [draft, setDraft] = useState(emptyDraft);
  const [cityId, setCityId] = useState(null);
  const [errors, setErrors] = useState([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const editingPoi = session?.poi ?? null;
  const isNew = !editingPoi;

  // (Re)initialize the draft when an editing session starts.
  useEffect(() => {
    if (!session) return;
    setDraft(session.poi ? draftFromPoi(session.poi) : emptyDraft);
    setCityId(session.cityId ?? null);
    setErrors([]);
    setIsLocating(false);
    setIsSaving(false);
  }, [session]);

  // Apply coordinates picked on the map (the sheet was hidden meanwhile).
  useEffect(() => {
    if (pickedCoordinates) {
      setDraft((prev) => ({ ...prev, coordinates: pickedCoordinates }));
      setErrors([]);
    }
  }, [pickedCoordinates]);

  // Escape cancels (only while the form is actually visible).
  useEffect(() => {
    if (!session || isPicking) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [session, isPicking, onClose]);

  if (!session) return null;

  const setField = (field) => (e) => {
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
  const tourUsingPoi = editingPoi
    ? Object.values(poisData.walkingTours ?? {})
        .flat()
        .find((tour) => tour.poiSequence.includes(editingPoi.id))
    : null;

  const buildPoi = () => {
    const trimmedName = draft.name.trim();
    const [lng, lat] = draft.coordinates ?? [];
    return {
      // Preserve fields the form doesn't edit (walkingTourNotes, photos,
      // visibility) by building on top of the original POI.
      ...(editingPoi ?? { photos: [], visibility: 'always' }),
      id: editingPoi?.id ?? generatePoiId(trimmedName, cityId, poisData),
      name: trimmedName,
      coordinates: draft.coordinates,
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
    const problems = [];
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
      await onSave(poi, cityId);
      onClose();
    } catch (err) {
      setErrors([`Saving failed: ${err.message}`]);
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (tourUsingPoi) return;
    const verb = isBasePoi(editingPoi.id) ? 'Hide' : 'Delete';
    if (!window.confirm(`${verb} "${editingPoi.name}"? You can restore it later by exporting and re-editing, but not from the app.`)) return;
    try {
      await onDelete(editingPoi.id, cityId);
      onClose();
    } catch (err) {
      setErrors([`Deleting failed: ${err.message}`]);
    }
  };

  const handleReset = async () => {
    if (!window.confirm(`Discard your changes to "${editingPoi.name}" and restore the original?`)) return;
    try {
      await onReset(editingPoi.id);
      onClose();
    } catch (err) {
      setErrors([`Reset failed: ${err.message}`]);
    }
  };

  const cityName = (id) => poisData.cities.find((c) => c.id === id)?.name ?? id;
  const [lng, lat] = draft.coordinates ?? [];

  return (
    <>
      {/* Backdrop - intentionally does NOT close on tap: an accidental tap
          must not throw away a half-typed draft. Hidden while picking so the
          map is fully interactive. */}
      {!isPicking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1199
          }}
        />
      )}

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
          zIndex: 1200,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          transform: isPicking ? 'translateY(110%)' : 'translateY(0)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
        <div style={{ padding: '16px 24px 12px 24px', borderBottom: '1px solid #f3f4f6' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1f2937', textAlign: 'center' }}>
            {isNew ? '➕ Add Place' : `✏️ Edit ${editingPoi.name}`}
          </h2>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '4px 24px 24px 24px',
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom))'
          }}
        >
          {isNew ? (
            <>
              <label style={labelStyle} htmlFor="poi-city">City</label>
              <select
                id="poi-city"
                value={cityId ?? ''}
                onChange={(e) => setCityId(e.target.value || null)}
                style={fieldStyle}
              >
                <option value="" disabled>Choose a city…</option>
                {poisData.cities.map((city) => (
                  <option key={city.id} value={city.id}>{city.name}</option>
                ))}
              </select>
            </>
          ) : (
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '12px' }}>
              📍 {cityName(cityId)}
            </div>
          )}

          <label style={labelStyle} htmlFor="poi-name">Name</label>
          <input
            id="poi-name"
            type="text"
            value={draft.name}
            onChange={setField('name')}
            placeholder="e.g. Café de Klos"
            style={fieldStyle}
          />

          <label style={labelStyle} htmlFor="poi-category">Category</label>
          <select
            id="poi-category"
            value={draft.category}
            onChange={setField('category')}
            style={fieldStyle}
          >
            {VALID_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category] ?? category}
              </option>
            ))}
          </select>

          <label style={labelStyle}>Location</label>
          <div
            style={{
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '10px 12px',
              backgroundColor: '#f9fafb'
            }}
          >
            <div style={{ fontSize: '14px', color: draft.coordinates ? '#1f2937' : '#9ca3af', marginBottom: '10px' }}>
              {draft.coordinates
                ? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                : 'No location set yet'}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={onStartPicking} style={{ ...secondaryButtonStyle, flex: 1 }}>
                🗺️ Tap on map
              </button>
              <button
                onClick={handleUseMyLocation}
                disabled={isLocating}
                style={{ ...secondaryButtonStyle, flex: 1, opacity: isLocating ? 0.6 : 1 }}
              >
                {isLocating ? '⏳ Locating…' : '🧭 My location'}
              </button>
            </div>
          </div>

          <label style={labelStyle} htmlFor="poi-description">Description</label>
          <textarea
            id="poi-description"
            value={draft.description}
            onChange={setField('description')}
            placeholder="What is this place?"
            rows={3}
            style={{ ...fieldStyle, resize: 'vertical' }}
          />

          <label style={labelStyle} htmlFor="poi-notes">Notes <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional — hours, prices, tips)</span></label>
          <textarea
            id="poi-notes"
            value={draft.notes}
            onChange={setField('notes')}
            placeholder="e.g. Open until 22:00, cash only"
            rows={2}
            style={{ ...fieldStyle, resize: 'vertical' }}
          />

          <label style={labelStyle} htmlFor="poi-gmaps">Google Maps link <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional — generated from location if empty)</span></label>
          <input
            id="poi-gmaps"
            type="url"
            inputMode="url"
            value={draft.googleMapsUrl}
            onChange={setField('googleMapsUrl')}
            placeholder="https://maps.app.goo.gl/…"
            style={fieldStyle}
          />

          {errors.length > 0 && (
            <div
              style={{
                marginTop: '16px',
                backgroundColor: '#fef2f2',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '10px 14px'
              }}
            >
              {errors.map((error, i) => (
                <div key={i} style={{ fontSize: '13px', color: '#991b1b', lineHeight: 1.5 }}>
                  ⚠️ {error}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button onClick={onClose} style={{ ...secondaryButtonStyle, flex: 1, padding: '12px 14px' }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                flex: 2,
                backgroundColor: colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: isSaving ? 0.6 : 1
              }}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>

          {!isNew && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {isBasePoi(editingPoi.id) && hasEdit(editingPoi.id) && (
                <button
                  onClick={handleReset}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.primary,
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '6px'
                  }}
                >
                  ↩️ Reset to original
                </button>
              )}
              {tourUsingPoi ? (
                <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', padding: '6px' }}>
                  This place is a stop on “{tourUsingPoi.name}” and can’t be deleted.
                </div>
              ) : (
                <button
                  onClick={handleDelete}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.error,
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '6px'
                  }}
                >
                  🗑️ {isBasePoi(editingPoi.id) ? 'Hide this place' : 'Delete this place'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PoiEditorSheet;
