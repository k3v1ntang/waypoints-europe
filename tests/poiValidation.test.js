import { describe, expect, it } from 'vitest';
import {
  isNonEmptyString,
  getCoordinateErrors,
  getPoiErrors,
  EUROPE_BOUNDS,
} from '../src/data/poiValidation.js';

function validPoi(overrides = {}) {
  return {
    id: 'amsterdam-anne-frank-house',
    name: 'Anne Frank House',
    coordinates: [4.8840, 52.3752],
    category: 'landmark',
    visibility: 'always',
    description: 'Museum in the building where Anne Frank hid during WWII.',
    notes: 'Book tickets weeks in advance.',
    googleMapsUrl: 'https://maps.app.goo.gl/xyz',
    photos: [],
    ...overrides,
  };
}

describe('isNonEmptyString', () => {
  it('accepts a non-empty string', () => {
    expect(isNonEmptyString('hello')).toBe(true);
  });

  it('rejects an empty or whitespace-only string', () => {
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString('   ')).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString(42)).toBe(false);
  });
});

describe('getCoordinateErrors', () => {
  it('accepts a valid [lng, lat] pair inside the Europe bounds', () => {
    expect(getCoordinateErrors([4.8840, 52.3752])).toEqual([]);
  });

  it('rejects a non-array or wrong-length value', () => {
    expect(getCoordinateErrors(null)).toHaveLength(1);
    expect(getCoordinateErrors([1])).toHaveLength(1);
    expect(getCoordinateErrors([1, 2, 3])).toHaveLength(1);
  });

  it('rejects non-numeric or NaN values', () => {
    expect(getCoordinateErrors(['4.88', 52])).toHaveLength(1);
    expect(getCoordinateErrors([NaN, 52])).toHaveLength(1);
  });

  it('catches the classic [lat, lng] vs [lng, lat] swap', () => {
    // Amsterdam is lat 52.37, lng 4.88 - swapped puts "lng" at 52 (out of
    // bounds) and "lat" at 4.88 (in range), which the bounding box catches.
    const errors = getCoordinateErrors([52.3752, 4.8840]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/swapped/);
  });

  it('rejects coordinates outside the Europe bounding box', () => {
    const errors = getCoordinateErrors([EUROPE_BOUNDS.maxLng + 10, 50]);
    expect(errors).toHaveLength(1);
  });
});

describe('getPoiErrors', () => {
  it('returns no errors for a fully valid POI', () => {
    expect(getPoiErrors(validPoi())).toEqual([]);
  });

  it('flags a missing id and name', () => {
    const errors = getPoiErrors(validPoi({ id: '', name: undefined }));
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('"id"'),
        expect.stringContaining('"name"'),
      ])
    );
  });

  it('flags an invalid category', () => {
    const errors = getPoiErrors(validPoi({ category: 'nightlife' }));
    expect(errors.some((e) => e.includes('invalid category'))).toBe(true);
  });

  it('flags an invalid visibility', () => {
    const errors = getPoiErrors(validPoi({ visibility: 'sometimes' }));
    expect(errors.some((e) => e.includes('invalid visibility'))).toBe(true);
  });

  it('flags a missing description and googleMapsUrl', () => {
    const errors = getPoiErrors(validPoi({ description: '', googleMapsUrl: '' }));
    expect(errors.some((e) => e.includes('description'))).toBe(true);
    expect(errors.some((e) => e.includes('googleMapsUrl'))).toBe(true);
  });

  it('flags a googleMapsUrl using a non-https scheme (F2)', () => {
    const jsErrors = getPoiErrors(validPoi({ googleMapsUrl: 'javascript:alert(1)' }));
    expect(jsErrors.some((e) => e.includes('https:'))).toBe(true);

    const httpErrors = getPoiErrors(validPoi({ googleMapsUrl: 'http://maps.google.com/xyz' }));
    expect(httpErrors.some((e) => e.includes('https:'))).toBe(true);
  });

  it('flags a googleMapsUrl that is not a valid URL at all (F2)', () => {
    const errors = getPoiErrors(validPoi({ googleMapsUrl: 'not a url' }));
    expect(errors.some((e) => e.includes('valid URL'))).toBe(true);
  });

  it('requires "notes" to be a string, empty allowed', () => {
    expect(getPoiErrors(validPoi({ notes: '' }))).toEqual([]);
    const errors = getPoiErrors(validPoi({ notes: undefined }));
    expect(errors.some((e) => e.includes('notes'))).toBe(true);
  });

  it('allows a missing "photos" field but rejects a malformed one', () => {
    const { photos: _photos, ...withoutPhotos } = validPoi();
    expect(getPoiErrors(withoutPhotos)).toEqual([]);

    const notArray = getPoiErrors(validPoi({ photos: 'oops' }));
    expect(notArray.some((e) => e.includes('"photos" must be an array'))).toBe(true);

    const badEntries = getPoiErrors(validPoi({ photos: ['/images/a.webp', ''] }));
    expect(badEntries.some((e) => e.includes('non-empty strings'))).toBe(true);
  });

  it('surfaces coordinate errors alongside other field errors', () => {
    const errors = getPoiErrors(validPoi({ coordinates: [200, 200], category: 'nope' }));
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});
