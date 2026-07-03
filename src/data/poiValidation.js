// Shared POI validation rules - the single source of truth used both by the
// Node prebuild script (scripts/validate-pois.js) and by the in-app POI
// editing form, so an edit that saves in the app can never fail the build
// after export. Keep this module browser-safe: no Node imports.

// Loose bounding box covering continental Europe (incl. Nordics/Baltics).
// Its main job is catching the [lat, lng] vs [lng, lat] swap footgun: a
// swapped coordinate pair lands outside this box for every city in the app.
export const EUROPE_BOUNDS = { minLng: -25, maxLng: 45, minLat: 34, maxLat: 71 };

export const VALID_CATEGORIES = ['landmark', 'culture', 'food', 'practical', 'hotel'];
export const VALID_VISIBILITY = ['always', 'walkingTour'];

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// Returns an array of error messages (empty when valid).
export function getCoordinateErrors(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return [`coordinates must be a [longitude, latitude] pair, got ${JSON.stringify(coordinates)}`];
  }
  const [lng, lat] = coordinates;
  if (typeof lng !== 'number' || typeof lat !== 'number' || Number.isNaN(lng) || Number.isNaN(lat)) {
    return [`coordinates must be numbers, got ${JSON.stringify(coordinates)}`];
  }
  if (
    lng < EUROPE_BOUNDS.minLng || lng > EUROPE_BOUNDS.maxLng ||
    lat < EUROPE_BOUNDS.minLat || lat > EUROPE_BOUNDS.maxLat
  ) {
    return [
      `coordinates [${lng}, ${lat}] fall outside the Europe bounding box ` +
      `(lng ${EUROPE_BOUNDS.minLng}..${EUROPE_BOUNDS.maxLng}, lat ${EUROPE_BOUNDS.minLat}..${EUROPE_BOUNDS.maxLat}). ` +
      `This usually means [lat, lng] were swapped instead of [lng, lat].`
    ];
  }
  return [];
}

// Field-level validation of a single POI object. Uniqueness of ids and
// cross-references (walking tour sequences) are the caller's concern since
// they need the whole data set.
export function getPoiErrors(poi) {
  const errors = [];

  if (!isNonEmptyString(poi.id)) errors.push('missing or empty "id"');
  if (!isNonEmptyString(poi.name)) errors.push('missing or empty "name"');
  errors.push(...getCoordinateErrors(poi.coordinates));

  if (!VALID_CATEGORIES.includes(poi.category)) {
    errors.push(`invalid category "${poi.category}" — must be one of ${VALID_CATEGORIES.join(', ')}`);
  }
  if (!VALID_VISIBILITY.includes(poi.visibility)) {
    errors.push(`invalid visibility "${poi.visibility}" — must be one of ${VALID_VISIBILITY.join(', ')}`);
  }
  if (!isNonEmptyString(poi.description)) errors.push('missing or empty "description"');
  if (typeof poi.notes !== 'string') errors.push('missing "notes" field (must be a string, empty allowed)');
  if (!isNonEmptyString(poi.googleMapsUrl)) errors.push('missing or empty "googleMapsUrl"');
  if (poi.photos !== undefined) {
    if (!Array.isArray(poi.photos)) {
      errors.push('"photos" must be an array if present');
    } else if (poi.photos.some((p) => !isNonEmptyString(p))) {
      errors.push('"photos" entries must all be non-empty strings');
    }
  }

  return errors;
}
