import { describe, expect, it } from 'vitest';
import { updatePhotosInRawText } from '../scripts/process-photos.js';

function sampleRaw() {
  return [
    '{',
    '  "cities": [',
    '    {',
    '      "id": "amsterdam",',
    '      "pois": [',
    '        {',
    '          "id": "amsterdam-anne-frank-house",',
    '          "name": "Anne Frank House",',
    '          "photos": []',
    '        },',
    '        {',
    '          "id": "amsterdam-vondelpark",',
    '          "name": "Vondelpark",',
    '          "photos": [',
    '            "/images/amsterdam-vondelpark/1.webp"',
    '          ]',
    '        }',
    '      ]',
    '    }',
    '  ]',
    '}',
    '',
  ].join('\n');
}

describe('updatePhotosInRawText', () => {
  it('rewrites an empty photos array with new entries', () => {
    const out = updatePhotosInRawText(sampleRaw(), 'amsterdam-anne-frank-house', [
      '/images/amsterdam-anne-frank-house/1.webp',
      '/images/amsterdam-anne-frank-house/2.webp',
    ]);
    const parsed = JSON.parse(out);
    const poi = parsed.cities[0].pois.find((p) => p.id === 'amsterdam-anne-frank-house');
    expect(poi.photos).toEqual([
      '/images/amsterdam-anne-frank-house/1.webp',
      '/images/amsterdam-anne-frank-house/2.webp',
    ]);
  });

  it('leaves the rest of the document untouched (surgical edit, not a full round-trip)', () => {
    const raw = sampleRaw();
    const out = updatePhotosInRawText(raw, 'amsterdam-anne-frank-house', ['/images/x/1.webp']);
    const untouchedTail = raw.slice(raw.indexOf('"amsterdam-vondelpark"'));
    expect(out.endsWith(untouchedTail)).toBe(true);
  });

  it('replaces a non-empty photos array and can shrink it back to empty', () => {
    const out = updatePhotosInRawText(sampleRaw(), 'amsterdam-vondelpark', []);
    const parsed = JSON.parse(out);
    const poi = parsed.cities[0].pois.find((p) => p.id === 'amsterdam-vondelpark');
    expect(poi.photos).toEqual([]);
  });

  it('formats multiple entries one per line matching the surrounding indent', () => {
    const out = updatePhotosInRawText(sampleRaw(), 'amsterdam-anne-frank-house', ['/a.webp', '/b.webp']);
    expect(out).toContain('"photos": [\n            "/a.webp",\n            "/b.webp"\n          ]');
  });

  it('throws when the POI id is not found', () => {
    expect(() => updatePhotosInRawText(sampleRaw(), 'does-not-exist', [])).toThrow(/not found/);
  });

  it('throws when the POI has no "photos" field and none follows it', () => {
    const raw = [
      '{',
      '  "cities": [',
      '    {',
      '      "id": "amsterdam",',
      '      "pois": [',
      '        {',
      '          "id": "amsterdam-no-photos-field",',
      '          "name": "No Photos Field"',
      '        }',
      '      ]',
      '    }',
      '  ]',
      '}',
      '',
    ].join('\n');
    expect(() => updatePhotosInRawText(raw, 'amsterdam-no-photos-field', ['/a.webp'])).toThrow(/No "photos" field/);
  });
});
