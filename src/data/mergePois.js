// Pure merge of the IndexedDB edit overlay over the bundled pois.json.
// Returns a data object with the same shape as pois.json, so everything
// downstream (map, navigation, export, validation) is agnostic about
// whether a POI came from the repo or from an in-trip edit.

export function mergePois(baseData, edits) {
  if (!edits || edits.length === 0) return baseData;

  const editsByPoiId = new Map(edits.map((e) => [e.poiId, e]));

  const cities = baseData.cities.map((city) => {
    const pois = city.pois
      .map((poi) => {
        const edit = editsByPoiId.get(poi.id);
        if (!edit) return poi;
        if (edit.type === 'delete') return null;
        if (edit.type === 'override') return edit.poi;
        return poi;
      })
      .filter(Boolean);

    const added = edits
      .filter((e) => e.type === 'new' && e.cityId === city.id)
      .sort((a, b) => (a.updatedAt ?? 0) - (b.updatedAt ?? 0))
      .map((e) => e.poi);

    return { ...city, pois: [...pois, ...added] };
  });

  return { ...baseData, cities };
}

// Slug-based id for POIs created in-app, unique across the merged data set
// (e.g. "amsterdam-cafe-de-klos", "-2" suffix on collision).
export function generatePoiId(name, cityId, poisData) {
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
