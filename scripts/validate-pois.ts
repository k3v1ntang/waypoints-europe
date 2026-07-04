#!/usr/bin/env -S npx tsx
// Validates src/data/pois.json. Run via `npm run validate:pois` (also runs
// automatically as a `prebuild` hook so a broken data file fails the build
// instead of shipping). Exits non-zero on any error.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  isNonEmptyString,
  getCoordinateErrors,
  getPoiErrors
} from '../src/data/poiValidation.js';
import type { City, Poi, PoisData, WalkingTour } from '../src/data/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '../src/data/pois.json');

// Field-level rules (Europe bounding box, enums, required fields) live in
// src/data/poiValidation.ts so the in-app POI editor enforces the same
// rules. This script adds the whole-file concerns: id uniqueness, city
// structure, and walking-tour cross-references.

const errors: string[] = [];

function fail(message: string): void {
  errors.push(message);
}

function validateCoordinates(coordinates: unknown, label: string): void {
  getCoordinateErrors(coordinates).forEach((e) => fail(`${label}: ${e}`));
}

function validatePoi(poi: Poi, city: City, seenIds: Set<string>): void {
  if (!isNonEmptyString(poi.id)) {
    fail(`POI in ${city.id} (index within city pois array): missing or empty "id"`);
    return;
  }
  const idLabel = `POI "${poi.id}" (${city.id})`;
  if (seenIds.has(poi.id)) {
    fail(`${idLabel}: duplicate id — POI ids must be unique across the whole app`);
  }
  seenIds.add(poi.id);

  getPoiErrors(poi).forEach((e) => fail(`${idLabel}: ${e}`));
}

function validateCity(city: City, seenIds: Set<string>): void {
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

function validateWalkingTours(
  walkingTours: Record<string, WalkingTour[]> | undefined,
  citiesById: Map<string, City>
): void {
  if (walkingTours === undefined) return;

  for (const [cityId, tours] of Object.entries(walkingTours)) {
    const city = citiesById.get(cityId);
    if (!city) {
      fail(`walkingTours: key "${cityId}" does not match any city id`);
      continue;
    }
    if (!Array.isArray(tours)) {
      fail(`walkingTours.${cityId}: must be an array of tour objects`);
      continue;
    }
    const cityPoiIds = new Set(city.pois.map((p) => p.id));

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

function main(): void {
  const raw = readFileSync(DATA_PATH, 'utf-8');
  let data: PoisData;
  try {
    // `JSON.parse` always returns `any`, so this cast is the same "trust
    // the shape, verify it below" bridge used for the pois.json import in
    // usePoiData.ts - the whole rest of this script is what actually earns
    // that trust, by walking `data` and reporting every field that doesn't
    // match.
    data = JSON.parse(raw) as PoisData;
  } catch (err) {
    console.error(`✖ pois.json is not valid JSON: ${(err as Error).message}`);
    process.exit(1);
  }

  if (!Array.isArray(data.cities) || data.cities.length === 0) {
    console.error('✖ pois.json: "cities" must be a non-empty array');
    process.exit(1);
  }

  const seenIds = new Set<string>();
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
