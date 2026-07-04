// Shared POI validation rules - the single source of truth used both by the
// Node prebuild script (scripts/validate-pois.ts) and by the in-app POI
// editing form, so an edit that saves in the app can never fail the build
// after export. Keep this module browser-safe: no Node imports.

import type { Category, Poi, Visibility } from './types.js';

// Loose bounding box covering continental Europe (incl. Nordics/Baltics).
// Its main job is catching the [lat, lng] vs [lng, lat] swap footgun: a
// swapped coordinate pair lands outside this box for every city in the app.
export const EUROPE_BOUNDS = { minLng: -25, maxLng: 45, minLat: 34, maxLat: 71 };

export const VALID_CATEGORIES: Category[] = ['landmark', 'culture', 'food', 'practical', 'hotel'];
export const VALID_VISIBILITY: Visibility[] = ['always', 'walkingTour'];

// ❓ CONCEPT: Type predicate (`value is string`) - a function whose return
// type tells TypeScript what a `true` result narrows the argument to.
// 📝 EXPLANATION: Callers that guard on `isNonEmptyString(x)` get `x`
// treated as `string` afterwards, not just `boolean` back. `unknown` below
// means "could be anything" - the honest type for a value that hasn't been
// checked yet, forcing the function to prove it's a string before use.
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidCategory(value: unknown): value is Category {
  return typeof value === 'string' && (VALID_CATEGORIES as string[]).includes(value);
}

function isValidVisibility(value: unknown): value is Visibility {
  return typeof value === 'string' && (VALID_VISIBILITY as string[]).includes(value);
}

// Returns an array of error messages (empty when valid). `coordinates` is
// `unknown` because this also validates raw, not-yet-trusted input (a
// pasted value in the editor form, a hand-edited pois.json entry).
export function getCoordinateErrors(coordinates: unknown): string[] {
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

// F2 (security review, July 2026): the in-app editor lets a user paste
// anything into googleMapsUrl. React 19 already blocks a rendered
// `javascript:` href at the DOM layer, so this is data-quality only now -
// catching pasted non-URLs and non-https schemes before they reach pois.json.
function getGoogleMapsUrlErrors(googleMapsUrl: unknown): string[] {
  if (!isNonEmptyString(googleMapsUrl)) {
    return ['missing or empty "googleMapsUrl"'];
  }
  let parsed: URL;
  try {
    parsed = new URL(googleMapsUrl);
  } catch {
    return [`"googleMapsUrl" must be a valid URL, got "${googleMapsUrl}"`];
  }
  if (parsed.protocol !== 'https:') {
    return [`"googleMapsUrl" must use the https: scheme, got "${parsed.protocol}" (${googleMapsUrl})`];
  }
  return [];
}

// Field-level validation of a single POI object. Uniqueness of ids and
// cross-references (walking tour sequences) are the caller's concern since
// they need the whole data set. `Partial<Poi>` (every field optional)
// reflects that the whole point of this function is checking whether an
// untrusted object actually has all the required Poi fields.
export function getPoiErrors(poi: Partial<Poi>): string[] {
  const errors: string[] = [];

  if (!isNonEmptyString(poi.id)) errors.push('missing or empty "id"');
  if (!isNonEmptyString(poi.name)) errors.push('missing or empty "name"');
  errors.push(...getCoordinateErrors(poi.coordinates));

  if (!isValidCategory(poi.category)) {
    errors.push(`invalid category "${poi.category}" — must be one of ${VALID_CATEGORIES.join(', ')}`);
  }
  if (!isValidVisibility(poi.visibility)) {
    errors.push(`invalid visibility "${poi.visibility}" — must be one of ${VALID_VISIBILITY.join(', ')}`);
  }
  if (!isNonEmptyString(poi.description)) errors.push('missing or empty "description"');
  if (typeof poi.notes !== 'string') errors.push('missing "notes" field (must be a string, empty allowed)');
  errors.push(...getGoogleMapsUrlErrors(poi.googleMapsUrl));
  if (poi.photos !== undefined) {
    if (!Array.isArray(poi.photos)) {
      errors.push('"photos" must be an array if present');
    } else if (poi.photos.some((p) => !isNonEmptyString(p))) {
      errors.push('"photos" entries must all be non-empty strings');
    }
  }

  return errors;
}
