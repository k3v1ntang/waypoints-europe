import { useState, useEffect, useMemo, useCallback } from 'react';
import basePoisData from '../data/pois.json';
import { mergePois } from '../data/mergePois.js';
import { getAllEdits, putEdit, removeEdit } from '../data/editStore.js';

// Ids of POIs that ship in the bundled pois.json - anything else was
// created in-app. Determines whether a save is an 'override' or 'new'
// record and whether a delete needs a tombstone.
const BASE_POI_IDS = new Set(
  basePoisData.cities.flatMap((city) => city.pois.map((poi) => poi.id))
);

// Upsert helper for the in-memory copy of the edit records.
const upsertRecord = (records, record) => [
  ...records.filter((r) => r.poiId !== record.poiId),
  record
];

// ❓ CONCEPT: Custom hook - reusable stateful logic extracted from a component.
// 📝 EXPLANATION: usePoiData owns the "base data + edit overlay" model:
// it loads saved edits from IndexedDB once, keeps an in-memory mirror of
// them in React state, and exposes the merged result plus save/delete/reset
// operations. Components consuming it just see POI data that happens to be
// editable. Each operation persists to IndexedDB first, then updates the
// mirror, so state never claims a write that didn't happen.
export function usePoiData() {
  const [edits, setEdits] = useState(null); // null until IndexedDB has been read

  useEffect(() => {
    let cancelled = false;
    getAllEdits()
      .then((records) => {
        if (!cancelled) setEdits(records);
      })
      .catch((err) => {
        // IndexedDB unavailable (very old browser / exotic private mode):
        // the app still works read-only from the bundled data.
        console.error('Failed to load POI edits from IndexedDB:', err);
        if (!cancelled) setEdits([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const poisData = useMemo(
    () => (edits && edits.length > 0 ? mergePois(basePoisData, edits) : basePoisData),
    [edits]
  );

  // Save a complete POI object (new or edited). `cityId` is the city it
  // belongs to. Persists first, then updates state.
  const savePoi = useCallback(async (poi, cityId) => {
    const record = {
      poiId: poi.id,
      cityId,
      type: BASE_POI_IDS.has(poi.id) ? 'override' : 'new',
      poi,
      updatedAt: Date.now()
    };
    await putEdit(record);
    setEdits((prev) => upsertRecord(prev ?? [], record));
  }, []);

  // Delete a POI: tombstone for base POIs, plain record removal for POIs
  // that were created in-app.
  const deletePoi = useCallback(async (poiId, cityId) => {
    if (BASE_POI_IDS.has(poiId)) {
      const record = { poiId, cityId, type: 'delete', updatedAt: Date.now() };
      await putEdit(record);
      setEdits((prev) => upsertRecord(prev ?? [], record));
    } else {
      await removeEdit(poiId);
      setEdits((prev) => (prev ?? []).filter((r) => r.poiId !== poiId));
    }
  }, []);

  // Discard the edit for one POI, restoring the bundled version (no-op for
  // in-app POIs, which have no bundled version to restore - use deletePoi).
  const resetPoi = useCallback(async (poiId) => {
    await removeEdit(poiId);
    setEdits((prev) => (prev ?? []).filter((r) => r.poiId !== poiId));
  }, []);

  return {
    poisData,
    editsReady: edits !== null,
    editCount: edits?.length ?? 0,
    isBasePoi: (poiId) => BASE_POI_IDS.has(poiId),
    savePoi,
    deletePoi,
    resetPoi
  };
}
