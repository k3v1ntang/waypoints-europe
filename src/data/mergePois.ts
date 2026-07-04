// Pure merge of the IndexedDB edit overlay over the bundled pois.json.
// Returns a data object with the same shape as pois.json, so everything
// downstream (map, navigation, export, validation) is agnostic about
// whether a POI came from the repo or from an in-trip edit.

import type { City, EditRecord, Poi, PoisData } from './types.js';

export function mergePois(baseData: PoisData, edits: EditRecord[] | null | undefined): PoisData {
  if (!edits || edits.length === 0) return baseData;

  const editsByPoiId = new Map(edits.map((e) => [e.poiId, e]));

  const cities: City[] = baseData.cities.map((city) => {
    const pois = city.pois
      .map((poi): Poi | null => {
        const edit = editsByPoiId.get(poi.id);
        if (!edit) return poi;
        if (edit.type === 'delete') return null;
        // `?? null` guards a malformed/legacy IndexedDB record that lacks
        // `poi` despite what the EditRecord type promises - types are
        // erased at runtime, so a corrupt override record's `poi` could
        // still be `undefined` here.
        if (edit.type === 'override') return edit.poi ?? null;
        return poi;
      })
      // ❓ CONCEPT: Type predicate on `.filter()` - the same `value is T`
      // trick from poiValidation.ts, applied to an array method.
      // 📝 EXPLANATION: A plain `(poi) => poi !== null` predicate makes
      // `.filter()` drop the nulls at runtime, but its *type* stays
      // `(Poi | null)[]` - TypeScript can't tell a filter callback actually
      // removes a case. Writing `poi is Poi` instead tells it the output
      // array is `Poi[]`, so `pois` below doesn't need another null check.
      .filter((poi): poi is Poi => poi !== null);

    // ❓ CONCEPT: `Extract<Union, Shape>` - a utility type that picks just
    // the union members matching `Shape` (here, EditRecord's `'new'` case).
    // 📝 EXPLANATION: Same idea as the `.filter()` above: the type
    // predicate tells TypeScript that anything surviving the filter has a
    // `poi` field, so the `.map((e) => e.poi)` below type-checks without
    // an extra cast.
    const added = edits
      .filter((e): e is Extract<EditRecord, { type: 'new' }> => e.type === 'new' && e.cityId === city.id)
      .sort((a, b) => (a.updatedAt ?? 0) - (b.updatedAt ?? 0))
      .map((e) => e.poi);

    return { ...city, pois: [...pois, ...added] };
  });

  return { ...baseData, cities };
}

// Slug-based id for POIs created in-app, unique across the merged data set
// (e.g. "amsterdam-cafe-de-klos", "-2" suffix on collision).
export function generatePoiId(name: string, cityId: string, poisData: PoisData): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritics (café -> cafe)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'poi';

  const existingIds = new Set(
    poisData.cities.flatMap((city) => city.pois.map((poi) => poi.id))
  );

  const base = `${cityId}-${slug}`;
  let candidate = base;
  for (let n = 2; existingIds.has(candidate); n++) {
    candidate = `${base}-${n}`;
  }
  return candidate;
}
