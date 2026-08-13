import { describe, expect, it } from 'vitest';
import { serializeChangeset, parseChangeset, mergeIncomingEdits } from '../src/data/editChangeset.js';

describe('serializeChangeset / parseChangeset', () => {
  it('round-trips edits through serialize and parse', () => {
    const edits = [
      { poiId: 'amsterdam-poi-a', cityId: 'amsterdam', type: 'override', updatedAt: 100, poi: { id: 'amsterdam-poi-a', name: 'Renamed' } }
    ];
    const parsed = parseChangeset(serializeChangeset(edits, 'Kevin'));
    expect(parsed.author).toBe('Kevin');
    expect(parsed.formatVersion).toBe(1);
    expect(parsed.edits).toEqual(edits);
  });

  it('omits author when not given', () => {
    const parsed = parseChangeset(serializeChangeset([]));
    expect(parsed.author).toBeUndefined();
  });

  it('rejects invalid JSON', () => {
    expect(() => parseChangeset('not json')).toThrow(/not valid json/i);
  });

  it('rejects a full pois.json export (no "edits" array)', () => {
    expect(() => parseChangeset(JSON.stringify({ cities: [] }))).toThrow(/edits.*array/i);
  });

  it('rejects a record missing a required field', () => {
    const bad = JSON.stringify({ edits: [{ cityId: 'amsterdam', type: 'delete', updatedAt: 1 }] });
    expect(() => parseChangeset(bad)).toThrow(/poiId/);
  });

  it('rejects an override/new record with no "poi" object', () => {
    const bad = JSON.stringify({ edits: [{ poiId: 'x', cityId: 'amsterdam', type: 'override', updatedAt: 1 }] });
    expect(() => parseChangeset(bad)).toThrow(/requires a "poi"/);
  });

  it('allows a delete record with no "poi" object', () => {
    const ok = JSON.stringify({ edits: [{ poiId: 'x', cityId: 'amsterdam', type: 'delete', updatedAt: 1 }] });
    expect(() => parseChangeset(ok)).not.toThrow();
  });
});

describe('mergeIncomingEdits', () => {
  it('applies an incoming edit with no local counterpart', () => {
    const result = mergeIncomingEdits([], [
      { poiId: 'a', cityId: 'amsterdam', type: 'delete', updatedAt: 1 }
    ]);
    expect(result.applied).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
    expect(result.merged.map((e) => e.poiId)).toEqual(['a']);
  });

  it('applies an incoming edit that is newer than the local one', () => {
    const local = [{ poiId: 'a', cityId: 'amsterdam', type: 'delete', updatedAt: 100 }];
    const incoming = [{ poiId: 'a', cityId: 'amsterdam', type: 'delete', updatedAt: 200 }];
    const result = mergeIncomingEdits(local, incoming);
    expect(result.applied).toEqual(incoming);
    expect(result.merged).toEqual(incoming);
  });

  it('skips an incoming edit that is older than the local one', () => {
    const local = [{ poiId: 'a', cityId: 'amsterdam', type: 'delete', updatedAt: 200 }];
    const incoming = [{ poiId: 'a', cityId: 'amsterdam', type: 'delete', updatedAt: 100 }];
    const result = mergeIncomingEdits(local, incoming);
    expect(result.skipped).toEqual(incoming);
    expect(result.merged).toEqual(local);
  });

  it('keeps the local record on an exact timestamp tie', () => {
    const local = [{ poiId: 'a', cityId: 'amsterdam', type: 'delete', updatedAt: 100 }];
    const incoming = [{ poiId: 'a', cityId: 'amsterdam', type: 'delete', updatedAt: 100 }];
    const result = mergeIncomingEdits(local, incoming);
    expect(result.skipped).toEqual(incoming);
  });

  it('leaves untouched local records alone and merges the rest', () => {
    const local = [
      { poiId: 'a', cityId: 'amsterdam', type: 'delete', updatedAt: 100 },
      { poiId: 'b', cityId: 'amsterdam', type: 'delete', updatedAt: 50 }
    ];
    const incoming = [{ poiId: 'c', cityId: 'paris', type: 'delete', updatedAt: 1 }];
    const result = mergeIncomingEdits(local, incoming);
    expect(result.merged.map((e) => e.poiId).sort()).toEqual(['a', 'b', 'c']);
  });
});
