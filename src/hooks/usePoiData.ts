import { useState, useEffect, useMemo, useCallback } from 'react';
import basePoisData from '../data/pois.json';
import { mergePois } from '../data/mergePois.js';
import { getAllEdits, putEdit, removeEdit } from '../data/editStore.js';
import type { EditRecord, Poi, PoisData } from '../data/types.js';

// pois.json is imported as plain JSON, so TypeScript infers its shape from
// the file content (e.g. coordinates widen to `number[]`, not the `[number,
// number]` tuple PoisData expects, and enums widen to `string`). The
// `unknown` bridge below is TypeScript's "I know this looks unrelated, but
// trust me" cast for exactly that gap - scripts/validate-pois.ts is what
// actually enforces the shape at build time.
const typedBasePoisData = basePoisData as unknown as PoisData;

// Ids of POIs that ship in the bundled pois.json - anything else was
// created in-app. Determines whether a save is an 'override' or 'new'
// record and whether a delete needs a tombstone.
const BASE_POI_IDS = new Set(
  typedBasePoisData.cities.flatMap((city) => city.pois.map((poi) => poi.id))
);

// Upsert helper for the in-memory copy of the edit records.
const upsertRecord = (records: EditRecord[], record: EditRecord): EditRecord[] => [
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
  // `useState<EditRecord[] | null>` - `null` means "IndexedDB hasn't been
  // read yet"; once read, it's always an array (possibly empty).
  const [edits, setEdits] = useState<EditRecord[] | null>(null);

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
    () => (edits && edits.length > 0 ? mergePois(typedBasePoisData, edits) : typedBasePoisData),
    [edits]
  );

  // Save a complete POI object (new or edited). `cityId` is the city it
  // belongs to. Persists first, then updates state.
  const savePoi = useCallback(async (poi: Poi, cityId: string) => {
    const record: EditRecord = {
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
  const deletePoi = useCallback(async (poiId: string, cityId: string) => {
    if (BASE_POI_IDS.has(poiId)) {
      const record: EditRecord = { poiId, cityId, type: 'delete', updatedAt: Date.now() };
      await putEdit(record);
      setEdits((prev) => upsertRecord(prev ?? [], record));
    } else {
      await removeEdit(poiId);
      setEdits((prev) => (prev ?? []).filter((r) => r.poiId !== poiId));
    }
  }, []);

  // Discard the edit for one POI, restoring the bundled version (no-op for
  // in-app POIs, which have no bundled version to restore - use deletePoi).
  const resetPoi = useCallback(async (poiId: string) => {
    await removeEdit(poiId);
    setEdits((prev) => (prev ?? []).filter((r) => r.poiId !== poiId));
  }, []);

  return {
    poisData,
    editsReady: edits !== null,
    editCount: edits?.length ?? 0,
    isBasePoi: (poiId: string) => BASE_POI_IDS.has(poiId),
    hasEdit: (poiId: string) => (edits ?? []).some((r) => r.poiId === poiId),
    savePoi,
    deletePoi,
    resetPoi
  };
}
