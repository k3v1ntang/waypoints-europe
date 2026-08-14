import { describe, expect, it } from 'vitest';
import { detectAndMergeEdits } from '../scripts/detect-edit-conflicts.js';

function baseData() {
  return {
    cities: [
      {
        id: 'amsterdam',
        name: 'Amsterdam',
        pois: [
          {
            id: 'amsterdam-poi-a',
            name: 'POI A',
            coordinates: [4.9, 52.37],
            category: 'landmark',
            visibility: 'always',
            description: 'Original description',
            walkingTourNotes: 'Curated tour history for A',
            notes: 'original notes',
            googleMapsUrl: 'https://maps.google.com/a',
            photos: []
          },
          { id: 'amsterdam-poi-b', name: 'POI B', notes: '', googleMapsUrl: 'https://maps.google.com/b' },
        ],
      },
      {
        id: 'paris',
        name: 'Paris',
        pois: [
          { id: 'paris-poi-c', name: 'POI C', notes: 'c notes', googleMapsUrl: 'https://maps.google.com/c' },
        ],
      },
    ],
  };
}

function edit(source, poiId, cityId, type, poiOverrides, updatedAt = 1) {
  const record = { poiId, cityId, type, updatedAt };
  if (type !== 'delete') {
    record.poi = { id: poiId, ...poiOverrides };
  }
  return { source, path: `${source}.json`, edit: record };
}

describe('detectAndMergeEdits', () => {
  it('1. applies edits to disjoint POIs from two files, no conflicts', () => {
    const sourceEdits = [
      edit('a', 'amsterdam-poi-a', 'amsterdam', 'override', { name: 'POI A', notes: 'from a' }),
      edit('b', 'paris-poi-c', 'paris', 'override', { name: 'POI C', notes: 'from b' }),
    ];
    const result = detectAndMergeEdits(baseData(), sourceEdits);
    expect(result.conflicts).toHaveLength(0);
    expect(result.applied.sort()).toEqual(['amsterdam-poi-a', 'paris-poi-c']);
    const amsterdam = result.data.cities.find((c) => c.id === 'amsterdam');
    expect(amsterdam.pois.find((p) => p.id === 'amsterdam-poi-a').notes).toBe('from a');
    const paris = result.data.cities.find((c) => c.id === 'paris');
    expect(paris.pois.find((p) => p.id === 'paris-poi-c').notes).toBe('from b');
  });

  it('2. flags a conflict when two files edit the same field to different values', () => {
    const base = baseData();
    const sourceEdits = [
      edit('a', 'amsterdam-poi-a', 'amsterdam', 'override', { ...base.cities[0].pois[0], notes: 'from a' }),
      edit('b', 'amsterdam-poi-a', 'amsterdam', 'override', { ...base.cities[0].pois[0], notes: 'from b' }),
    ];
    const result = detectAndMergeEdits(base, sourceEdits);
    expect(result.applied).toHaveLength(0);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].reason).toBe('value-conflict');
    expect(result.conflicts[0].poiId).toBe('amsterdam-poi-a');
    const values = result.conflicts[0].values.map((v) => v.value.notes);
    expect(values.sort()).toEqual(['from a', 'from b']);
    // untouched
    const amsterdam = result.data.cities.find((c) => c.id === 'amsterdam');
    expect(amsterdam.pois.find((p) => p.id === 'amsterdam-poi-a').notes).toBe('original notes');
  });

  it('3. auto-merges when two files edit different fields on the same POI', () => {
    const base = baseData();
    const sourceEdits = [
      edit('a', 'amsterdam-poi-a', 'amsterdam', 'override', { ...base.cities[0].pois[0], notes: 'from a' }),
      edit('b', 'amsterdam-poi-a', 'amsterdam', 'override', { ...base.cities[0].pois[0], description: 'from b' }),
    ];
    const result = detectAndMergeEdits(base, sourceEdits);
    expect(result.conflicts).toHaveLength(0);
    expect(result.applied).toEqual(['amsterdam-poi-a']);
    const poi = result.data.cities.find((c) => c.id === 'amsterdam').pois.find((p) => p.id === 'amsterdam-poi-a');
    expect(poi.notes).toBe('from a');
    expect(poi.description).toBe('from b');
  });

  it('4. merges silently when two files edit the same field to the same value', () => {
    const base = baseData();
    const sourceEdits = [
      edit('a', 'amsterdam-poi-a', 'amsterdam', 'override', { ...base.cities[0].pois[0], notes: 'agreed' }),
      edit('b', 'amsterdam-poi-a', 'amsterdam', 'override', { ...base.cities[0].pois[0], notes: 'agreed' }),
    ];
    const result = detectAndMergeEdits(base, sourceEdits);
    expect(result.conflicts).toHaveLength(0);
    expect(result.applied).toEqual(['amsterdam-poi-a']);
    const poi = result.data.cities.find((c) => c.id === 'amsterdam').pois.find((p) => p.id === 'amsterdam-poi-a');
    expect(poi.notes).toBe('agreed');
  });

  it('5. applies a new POI present in only one file, base absent, into the right city', () => {
    const sourceEdits = [
      edit('a', 'amsterdam-new-1', 'amsterdam', 'new', { name: 'New Cafe', notes: '' }, 10),
    ];
    const result = detectAndMergeEdits(baseData(), sourceEdits);
    expect(result.conflicts).toHaveLength(0);
    expect(result.applied).toEqual(['amsterdam-new-1']);
    const amsterdam = result.data.cities.find((c) => c.id === 'amsterdam');
    expect(amsterdam.pois.map((p) => p.id)).toContain('amsterdam-new-1');
    expect(amsterdam.pois.find((p) => p.id === 'amsterdam-new-1').name).toBe('New Cafe');
  });

  it('6. flags a conflict for two differing "new" edits sharing an id, base absent', () => {
    const sourceEdits = [
      edit('a', 'amsterdam-new-1', 'amsterdam', 'new', { name: 'Cafe A version', notes: '' }),
      edit('b', 'amsterdam-new-1', 'amsterdam', 'new', { name: 'Cafe B version', notes: '' }),
    ];
    const result = detectAndMergeEdits(baseData(), sourceEdits);
    expect(result.applied).toHaveLength(0);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].reason).toBe('new-collision');
    const names = result.conflicts[0].values.map((v) => v.value.name);
    expect(names.sort()).toEqual(['Cafe A version', 'Cafe B version']);
  });

  it('7. flags a conflict when one file deletes a POI another file edits, base present', () => {
    const base = baseData();
    const sourceEdits = [
      edit('a', 'amsterdam-poi-a', 'amsterdam', 'delete', undefined),
      edit('b', 'amsterdam-poi-a', 'amsterdam', 'override', { ...base.cities[0].pois[0], notes: 'still here' }),
    ];
    const result = detectAndMergeEdits(base, sourceEdits);
    expect(result.applied).toHaveLength(0);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].reason).toBe('delete-vs-edit');
    // untouched: POI still present in the result
    const amsterdam = result.data.cities.find((c) => c.id === 'amsterdam');
    expect(amsterdam.pois.map((p) => p.id)).toContain('amsterdam-poi-a');
  });

  it('8. applies an unrelated new POI and an unrelated override together in one run', () => {
    const base = baseData();
    const sourceEdits = [
      edit('a', 'amsterdam-new-1', 'amsterdam', 'new', { name: 'New Cafe', notes: '' }),
      edit('b', 'paris-poi-c', 'paris', 'override', { ...base.cities[1].pois[0], notes: 'edited note' }),
    ];
    const result = detectAndMergeEdits(base, sourceEdits);
    expect(result.conflicts).toHaveLength(0);
    expect(result.applied.sort()).toEqual(['amsterdam-new-1', 'paris-poi-c']);
    const amsterdam = result.data.cities.find((c) => c.id === 'amsterdam');
    expect(amsterdam.pois.map((p) => p.id)).toContain('amsterdam-new-1');
    const paris = result.data.cities.find((c) => c.id === 'paris');
    expect(paris.pois.find((p) => p.id === 'paris-poi-c').notes).toBe('edited note');
  });

  it('9. resolves a stale-forever "new" edit for an id that already exists in base via the override path', () => {
    const base = baseData();
    const sourceEdits = [
      edit('a', 'amsterdam-poi-a', 'amsterdam', 'new', { ...base.cities[0].pois[0], notes: 'device still exports new' }),
    ];
    const result = detectAndMergeEdits(base, sourceEdits);
    expect(result.conflicts).toHaveLength(0);
    expect(result.applied).toEqual(['amsterdam-poi-a']);
    const amsterdam = result.data.cities.find((c) => c.id === 'amsterdam');
    // no duplicate id written
    expect(amsterdam.pois.filter((p) => p.id === 'amsterdam-poi-a')).toHaveLength(1);
    expect(amsterdam.pois.find((p) => p.id === 'amsterdam-poi-a').notes).toBe('device still exports new');
  });

  it('10. resolves "new" + "override" on the same id, base present, via the value-diff path', () => {
    const base = baseData();
    const sourceEdits = [
      edit('a', 'amsterdam-poi-a', 'amsterdam', 'new', { ...base.cities[0].pois[0], notes: 'from stale new' }),
      edit('b', 'amsterdam-poi-a', 'amsterdam', 'override', { ...base.cities[0].pois[0], description: 'from override' }),
    ];
    const result = detectAndMergeEdits(base, sourceEdits);
    expect(result.conflicts).toHaveLength(0);
    expect(result.applied).toEqual(['amsterdam-poi-a']);
    const amsterdam = result.data.cities.find((c) => c.id === 'amsterdam');
    expect(amsterdam.pois.filter((p) => p.id === 'amsterdam-poi-a')).toHaveLength(1);
    const poi = amsterdam.pois.find((p) => p.id === 'amsterdam-poi-a');
    expect(poi.notes).toBe('from stale new');
    expect(poi.description).toBe('from override');
  });

  it('11. never registers an untouched optional field as changed (photos/walkingTourNotes normalization)', () => {
    const base = baseData();
    // base has no photos and real walkingTourNotes (see baseData's amsterdam-poi-a).
    // Two edits touching different other fields, so the group lands in the
    // field-by-field diff branch (not the trivial "all identical" shortcut) -
    // both omit walkingTourNotes and pass an explicit empty photos array.
    const withoutWalkingTourNotes = (overrides) => {
      const poi = { ...base.cities[0].pois[0], photos: [], ...overrides };
      delete poi.walkingTourNotes;
      return poi;
    };
    const sourceEdits = [
      edit('a', 'amsterdam-poi-a', 'amsterdam', 'override', withoutWalkingTourNotes({ notes: 'updated notes' })),
      edit('b', 'amsterdam-poi-a', 'amsterdam', 'override', withoutWalkingTourNotes({ description: 'from b' })),
    ];
    const result = detectAndMergeEdits(base, sourceEdits);
    expect(result.conflicts).toHaveLength(0);
    expect(result.applied).toEqual(['amsterdam-poi-a']);
    const poi = result.data.cities.find((c) => c.id === 'amsterdam').pois.find((p) => p.id === 'amsterdam-poi-a');
    expect(poi.walkingTourNotes).toBe('Curated tour history for A');
    expect(poi.photos).toEqual([]);
    expect(poi.notes).toBe('updated notes');
    expect(poi.description).toBe('from b');
  });

  it('12. applies the clean POI and leaves the conflicted POI untouched in the same run', () => {
    const base = baseData();
    const sourceEdits = [
      edit('a', 'amsterdam-poi-a', 'amsterdam', 'override', { ...base.cities[0].pois[0], notes: 'from a' }),
      edit('b', 'amsterdam-poi-a', 'amsterdam', 'override', { ...base.cities[0].pois[0], notes: 'from b' }),
      edit('a', 'paris-poi-c', 'paris', 'override', { ...base.cities[1].pois[0], notes: 'clean edit' }),
    ];
    const result = detectAndMergeEdits(base, sourceEdits);
    expect(result.applied).toEqual(['paris-poi-c']);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].poiId).toBe('amsterdam-poi-a');
    const amsterdam = result.data.cities.find((c) => c.id === 'amsterdam');
    expect(amsterdam.pois.find((p) => p.id === 'amsterdam-poi-a').notes).toBe('original notes');
    const paris = result.data.cities.find((c) => c.id === 'paris');
    expect(paris.pois.find((p) => p.id === 'paris-poi-c').notes).toBe('clean edit');
  });
});
