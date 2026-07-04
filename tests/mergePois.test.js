import { describe, expect, it } from 'vitest';
import { mergePois, generatePoiId } from '../src/data/mergePois.js';

function baseData() {
  return {
    cities: [
      {
        id: 'amsterdam',
        name: 'Amsterdam',
        pois: [
          { id: 'amsterdam-poi-a', name: 'POI A' },
          { id: 'amsterdam-poi-b', name: 'POI B' },
        ],
      },
      {
        id: 'paris',
        name: 'Paris',
        pois: [{ id: 'paris-poi-c', name: 'POI C' }],
      },
    ],
  };
}

describe('mergePois', () => {
  it('returns the original data unchanged when there are no edits', () => {
    const data = baseData();
    expect(mergePois(data, [])).toBe(data);
    expect(mergePois(data, null)).toBe(data);
  });

  it('overrides a POI in place', () => {
    const edits = [{ poiId: 'amsterdam-poi-a', type: 'override', poi: { id: 'amsterdam-poi-a', name: 'Renamed A' } }];
    const merged = mergePois(baseData(), edits);
    const city = merged.cities.find((c) => c.id === 'amsterdam');
    expect(city.pois.find((p) => p.id === 'amsterdam-poi-a').name).toBe('Renamed A');
    expect(city.pois).toHaveLength(2);
  });

  it('drops a malformed override edit missing its poi field, instead of leaking undefined', () => {
    // Simulates a corrupted/legacy IndexedDB record - schema says 'override'
    // records always carry `poi`, but nothing enforces that at runtime.
    const edits = [{ poiId: 'amsterdam-poi-a', type: 'override' }];
    const merged = mergePois(baseData(), edits);
    const city = merged.cities.find((c) => c.id === 'amsterdam');
    expect(city.pois.map((p) => p.id)).toEqual(['amsterdam-poi-b']);
    expect(city.pois.every((p) => p !== undefined)).toBe(true);
  });

  it('deletes a POI', () => {
    const edits = [{ poiId: 'amsterdam-poi-b', type: 'delete' }];
    const merged = mergePois(baseData(), edits);
    const city = merged.cities.find((c) => c.id === 'amsterdam');
    expect(city.pois.map((p) => p.id)).toEqual(['amsterdam-poi-a']);
  });

  it('appends new POIs to the matching city, sorted by updatedAt', () => {
    const edits = [
      { type: 'new', cityId: 'amsterdam', updatedAt: 200, poi: { id: 'amsterdam-new-2', name: 'Second' } },
      { type: 'new', cityId: 'amsterdam', updatedAt: 100, poi: { id: 'amsterdam-new-1', name: 'First' } },
      { type: 'new', cityId: 'paris', updatedAt: 50, poi: { id: 'paris-new-1', name: 'Paris New' } },
    ];
    const merged = mergePois(baseData(), edits);
    const amsterdam = merged.cities.find((c) => c.id === 'amsterdam');
    expect(amsterdam.pois.map((p) => p.id)).toEqual([
      'amsterdam-poi-a',
      'amsterdam-poi-b',
      'amsterdam-new-1',
      'amsterdam-new-2',
    ]);
    const paris = merged.cities.find((c) => c.id === 'paris');
    expect(paris.pois.map((p) => p.id)).toEqual(['paris-poi-c', 'paris-new-1']);
  });

  it('ignores an edit whose poiId does not match any POI in that city', () => {
    const edits = [{ poiId: 'nonexistent-poi', type: 'override', poi: { id: 'nonexistent-poi', name: 'X' } }];
    const merged = mergePois(baseData(), edits);
    expect(merged.cities.find((c) => c.id === 'amsterdam').pois).toHaveLength(2);
  });

  it('combines override, delete, and new edits together', () => {
    const edits = [
      { poiId: 'amsterdam-poi-a', type: 'override', poi: { id: 'amsterdam-poi-a', name: 'Renamed A' } },
      { poiId: 'amsterdam-poi-b', type: 'delete' },
      { type: 'new', cityId: 'amsterdam', updatedAt: 1, poi: { id: 'amsterdam-new-1', name: 'New' } },
    ];
    const merged = mergePois(baseData(), edits);
    const city = merged.cities.find((c) => c.id === 'amsterdam');
    expect(city.pois.map((p) => p.id)).toEqual(['amsterdam-poi-a', 'amsterdam-new-1']);
    expect(city.pois[0].name).toBe('Renamed A');
  });
});

describe('generatePoiId', () => {
  it('slugifies the name and prefixes it with the city id', () => {
    expect(generatePoiId('Cafe de Klos', 'amsterdam', baseData())).toBe('amsterdam-cafe-de-klos');
  });

  it('strips combining diacritics', () => {
    expect(generatePoiId('Café Dé Something', 'paris', baseData())).toBe('paris-cafe-de-something');
  });

  it('falls back to "poi" when the name has no alphanumeric characters', () => {
    expect(generatePoiId('!!!', 'paris', baseData())).toBe('paris-poi');
  });

  it('appends a numeric suffix on id collision', () => {
    const data = baseData();
    data.cities[0].pois.push({ id: 'amsterdam-poi-a-clone', name: 'existing' });
    // First candidate 'amsterdam-poi-a-clone' collides -> bump to -2
    expect(generatePoiId('POI A Clone', 'amsterdam', data)).toBe('amsterdam-poi-a-clone-2');
  });
});
