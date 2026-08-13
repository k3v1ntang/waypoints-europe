import { useState, useEffect, useMemo, useCallback } from 'react';
import basePoisData from '../data/pois.json';
import { mergePois, poiEquals } from '../data/mergePois.js';
import { mergeIncomingEdits } from '../data/editChangeset.js';
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

// poiId -> Poi and poiId -> owning city, for two things a plain id set
// can't answer: detecting a since-become-redundant override (compare
// against the current bundled poi) and labeling a 'delete' tombstone in
// the pending-edits list (it carries no `poi`, so the name has to come
// from the base data it deleted).
const BASE_POI_BY_ID = new Map(
  typedBasePoisData.cities.flatMap((city) => city.pois.map((poi) => [poi.id, poi] as const))
);
const BASE_CITY_NAME_BY_ID = new Map(typedBasePoisData.cities.map((city) => [city.id, city.name] as const));

// Upsert helper for the in-memory copy of the edit records.
const upsertRecord = (records: EditRecord[], record: EditRecord): EditRecord[] => [
  ...records.filter((r) => r.poiId !== record.poiId),
  record
];

// A pending-edit row shaped for display (the ⋯ menu's edits list) - a
// human-readable name/city regardless of which EditRecord variant it is.
export interface EditSummary {
  poiId: string;
  cityId: string;
  name: string;
  cityName: string;
  type: EditRecord['type'];
}

function summarizeEdit(record: EditRecord): EditSummary {
  const name = record.type === 'delete' ? (BASE_POI_BY_ID.get(record.poiId)?.name ?? record.poiId) : record.poi.name;
  return {
    poiId: record.poiId,
    cityId: record.cityId,
    name,
    cityName: BASE_CITY_NAME_BY_ID.get(record.cityId) ?? record.cityId,
    type: record.type
  };
}

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
      .then(async (records) => {
        // Self-healing: an 'override' edit whose stored `poi` now exactly
        // matches the current bundled POI is redundant - the repo shipped
        // the same change the on-device edit already made (e.g. a live
        // edit later got folded into pois.json). Drop it silently rather
        // than leaving a phantom "1 edit on this device" that a manual
        // "Reset to original" would be a no-op for anyway.
        const stale = records.filter(
          (r) => r.type === 'override' && BASE_POI_IDS.has(r.poiId) && poiEquals(r.poi, BASE_POI_BY_ID.get(r.poiId)!)
        );
        if (stale.length > 0) {
          await Promise.all(stale.map((r) => removeEdit(r.poiId))).catch((err) => {
            console.error('Failed to clear stale synced edits:', err);
          });
        }
        const staleIds = new Set(stale.map((r) => r.poiId));
        if (!cancelled) setEdits(records.filter((r) => !staleIds.has(r.poiId)));
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

  const editSummaries = useMemo(() => (edits ?? []).map(summarizeEdit), [edits]);

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

  // Merge a changeset from someone else's device into the local overlay
  // (last-write-wins by `updatedAt` per record - see editChangeset.ts).
  // Persists only the records that actually changed, then replaces state
  // with the full merged set.
  const importEdits = useCallback(async (incoming: EditRecord[]) => {
    const current = edits ?? [];
    const { merged, applied, skipped } = mergeIncomingEdits(current, incoming);
    await Promise.all(applied.map((record) => putEdit(record)));
    setEdits(merged);
    return { applied: applied.length, skipped: skipped.length };
  }, [edits]);

  return {
    poisData,
    edits: edits ?? [],
    editsReady: edits !== null,
    editCount: edits?.length ?? 0,
    editSummaries,
    isBasePoi: (poiId: string) => BASE_POI_IDS.has(poiId),
    hasEdit: (poiId: string) => (edits ?? []).some((r) => r.poiId === poiId),
    savePoi,
    deletePoi,
    resetPoi,
    importEdits
  };
}
