#!/usr/bin/env node
// Validates src/data/pois.json. Run via `npm run validate:pois` (also runs
// automatically as a `prebuild` hook so a broken data file fails the build
// instead of shipping). Exits non-zero on any error.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '../src/data/pois.json');

// Loose bounding box covering continental Europe (incl. Nordics/Baltics).
// Existing trip cities range from Munich (lat 48) to Helsinki (lat 60); the
// August 2026 additions (Amsterdam, Paris) fall well inside it too. Its main
// job is catching the [lat, lng] vs [lng, lat] swap footgun: a swapped
// coordinate pair lands outside this box for every city in the app.
const EUROPE_BOUNDS = { minLng: -25, maxLng: 45, minLat: 34, maxLat: 71 };

const VALID_CATEGORIES = ['landmark', 'culture', 'food', 'practical', 'hotel'];
const VALID_VISIBILITY = ['always', 'walkingTour'];

const errors = [];

function fail(message) {
  errors.push(message);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateCoordinates(coordinates, label) {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    fail(`${label}: coordinates must be a [longitude, latitude] pair, got ${JSON.stringify(coordinates)}`);
    return;
  }
  const [lng, lat] = coordinates;
  if (typeof lng !== 'number' || typeof lat !== 'number') {
    fail(`${label}: coordinates must be numbers, got ${JSON.stringify(coordinates)}`);
    return;
  }
  if (
    lng < EUROPE_BOUNDS.minLng || lng > EUROPE_BOUNDS.maxLng ||
    lat < EUROPE_BOUNDS.minLat || lat > EUROPE_BOUNDS.maxLat
  ) {
    fail(
      `${label}: coordinates [${lng}, ${lat}] fall outside the Europe bounding box ` +
      `(lng ${EUROPE_BOUNDS.minLng}..${EUROPE_BOUNDS.maxLng}, lat ${EUROPE_BOUNDS.minLat}..${EUROPE_BOUNDS.maxLat}). ` +
      `This usually means [lat, lng] were swapped instead of [lng, lat].`
    );
  }
}

function validatePoi(poi, city, seenIds) {
  const label = `POI in ${city.id} (index within city pois array)`;

  if (!isNonEmptyString(poi.id)) {
    fail(`${label}: missing or empty "id"`);
  } else {
    const idLabel = `POI "${poi.id}" (${city.id})`;
    if (seenIds.has(poi.id)) {
      fail(`${idLabel}: duplicate id — POI ids must be unique across the whole app`);
    }
    seenIds.add(poi.id);

    if (!isNonEmptyString(poi.name)) fail(`${idLabel}: missing or empty "name"`);
    validateCoordinates(poi.coordinates, idLabel);

    if (!VALID_CATEGORIES.includes(poi.category)) {
      fail(`${idLabel}: invalid category "${poi.category}" — must be one of ${VALID_CATEGORIES.join(', ')}`);
    }
    if (!VALID_VISIBILITY.includes(poi.visibility)) {
      fail(`${idLabel}: invalid visibility "${poi.visibility}" — must be one of ${VALID_VISIBILITY.join(', ')}`);
    }
    if (!isNonEmptyString(poi.description)) fail(`${idLabel}: missing or empty "description"`);
    if (typeof poi.notes !== 'string') fail(`${idLabel}: missing "notes" field (must be a string, empty allowed)`);
    if (!isNonEmptyString(poi.googleMapsUrl)) fail(`${idLabel}: missing or empty "googleMapsUrl"`);
    if (poi.photos !== undefined && !Array.isArray(poi.photos)) {
      fail(`${idLabel}: "photos" must be an array if present`);
    }
  }
}

function validateCity(city, seenIds) {
  if (!isNonEmptyString(city.id)) {
    fail('City missing or empty "id"');
    return;
  }
  const label = `City "${city.id}"`;
  if (!isNonEmptyString(city.name)) fail(`${label}: missing or empty "name"`);
  if (!isNonEmptyString(city.country)) fail(`${label}: missing or empty "country"`);
  if (!isNonEmptyString(city.countryCode)) fail(`${label}: missing or empty "countryCode"`);
  validateCoordinates(city.centerCoordinates, `${label} centerCoordinates`);

  if (!Array.isArray(city.pois) || city.pois.length === 0) {
    fail(`${label}: "pois" must be a non-empty array`);
    return;
  }
  city.pois.forEach((poi) => validatePoi(poi, city, seenIds));
}

function validateWalkingTours(walkingTours, citiesById) {
  if (walkingTours === undefined) return;

  for (const [cityId, tours] of Object.entries(walkingTours)) {
    if (!citiesById.has(cityId)) {
      fail(`walkingTours: key "${cityId}" does not match any city id`);
      continue;
    }
    if (!Array.isArray(tours)) {
      fail(`walkingTours.${cityId}: must be an array of tour objects`);
      continue;
    }
    const cityPoiIds = new Set(citiesById.get(cityId).pois.map((p) => p.id));

    tours.forEach((tour, index) => {
      const label = `walkingTours.${cityId}[${index}]${tour?.id ? ` ("${tour.id}")` : ''}`;
      if (!isNonEmptyString(tour.id)) fail(`${label}: missing or empty "id"`);
      if (!isNonEmptyString(tour.name)) fail(`${label}: missing or empty "name"`);
      if (!Array.isArray(tour.poiSequence) || tour.poiSequence.length === 0) {
        fail(`${label}: "poiSequence" must be a non-empty array`);
        return;
      }
      tour.poiSequence.forEach((poiId) => {
        if (!cityPoiIds.has(poiId)) {
          fail(`${label}: poiSequence references "${poiId}", which is not a POI in city "${cityId}"`);
        }
      });
    });
  }
}

function main() {
  const raw = readFileSync(DATA_PATH, 'utf-8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`✖ pois.json is not valid JSON: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(data.cities) || data.cities.length === 0) {
    console.error('✖ pois.json: "cities" must be a non-empty array');
    process.exit(1);
  }

  const seenIds = new Set();
  data.cities.forEach((city) => validateCity(city, seenIds));

  const citiesById = new Map(data.cities.map((c) => [c.id, c]));
  validateWalkingTours(data.walkingTours, citiesById);

  const poiCount = data.cities.reduce((sum, c) => sum + (c.pois?.length ?? 0), 0);

  if (errors.length > 0) {
    console.error(`✖ pois.json validation failed with ${errors.length} error(s):`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log(`✓ pois.json valid: ${data.cities.length} cities, ${poiCount} POIs, ${Object.keys(data.walkingTours ?? {}).length} cities with walking tours`);
}

main();
