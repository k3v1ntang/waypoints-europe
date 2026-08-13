// A "changeset" is the small, shareable unit for handing edits between
// people/devices - just the IndexedDB EditRecord[] overlay (a handful of
// records), not a full re-serialized pois.json. This is the delta-sync
// pattern offline-first apps use for occasional multi-device merges: ship
// what changed, not the whole state, so two people's exports can be
// compared and merged without diffing a multi-thousand-line file.
//
// Conflict rule is last-write-wins by `updatedAt` (an LWW-Register CRDT,
// the standard simple-and-correct choice for "two people touched the same
// record" - see mergeIncomingEdits below). EditRecord already carries
// `updatedAt` for exactly this, previously unused for merging.

import type { EditRecord } from './types.js';

export interface EditChangeset {
  formatVersion: 1;
  /** Freeform label for whoever exported this (e.g. a name) - display-only. */
  author?: string;
  exportedAt: number;
  edits: EditRecord[];
}

export function serializeChangeset(edits: EditRecord[], author?: string): string {
  const changeset: EditChangeset = {
    formatVersion: 1,
    ...(author ? { author } : {}),
    exportedAt: Date.now(),
    edits
  };
  return JSON.stringify(changeset, null, 2) + '\n';
}

// Runtime validation for untrusted input (a file someone else exported and
// handed you) - the TypeScript type only checks code that already trusts
// the shape, not a parsed JSON blob from outside the app.
export function parseChangeset(json: string): EditChangeset {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (err) {
    throw new Error(`Not valid JSON: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
  }

  if (typeof data !== 'object' || data === null) {
    throw new Error('Expected a changeset object, got ' + JSON.stringify(data));
  }
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.edits)) {
    throw new Error('Missing or invalid "edits" array - is this an edits changeset file (not a full pois.json export)?');
  }
  obj.edits.forEach((edit, i) => {
    if (typeof edit !== 'object' || edit === null) {
      throw new Error(`edits[${i}] is not an object`);
    }
    const e = edit as Record<string, unknown>;
    if (typeof e.poiId !== 'string' || !e.poiId) throw new Error(`edits[${i}]: missing "poiId"`);
    if (typeof e.cityId !== 'string' || !e.cityId) throw new Error(`edits[${i}]: missing "cityId"`);
    if (typeof e.updatedAt !== 'number') throw new Error(`edits[${i}]: missing "updatedAt"`);
    if (e.type !== 'override' && e.type !== 'new' && e.type !== 'delete') {
      throw new Error(`edits[${i}]: invalid "type" ${JSON.stringify(e.type)}`);
    }
    if ((e.type === 'override' || e.type === 'new') && (typeof e.poi !== 'object' || e.poi === null)) {
      throw new Error(`edits[${i}]: type "${e.type}" requires a "poi" object`);
    }
  });

  return {
    formatVersion: 1,
    author: typeof obj.author === 'string' ? obj.author : undefined,
    exportedAt: typeof obj.exportedAt === 'number' ? obj.exportedAt : Date.now(),
    edits: obj.edits as EditRecord[]
  };
}

export interface MergeResult {
  /** Full edit set after merging - existing records not touched by `incoming`, plus the LWW-resolved incoming ones. */
  merged: EditRecord[];
  /** Incoming records that were newer (or had no local counterpart) and so were applied. */
  applied: EditRecord[];
  /** Incoming records skipped because the local edit for that POI was newer. */
  skipped: EditRecord[];
}

// Pure LWW merge: for each incoming record, keep it if there's no existing
// local edit for that poiId, or the incoming one is strictly newer. A tie
// keeps the local record (arbitrary but deterministic - avoids a phantom
// "change" when reimporting your own prior export).
export function mergeIncomingEdits(existing: EditRecord[], incoming: EditRecord[]): MergeResult {
  const existingById = new Map(existing.map((e) => [e.poiId, e]));
  const applied: EditRecord[] = [];
  const skipped: EditRecord[] = [];

  for (const record of incoming) {
    const current = existingById.get(record.poiId);
    if (!current || record.updatedAt > current.updatedAt) {
      existingById.set(record.poiId, record);
      applied.push(record);
    } else {
      skipped.push(record);
    }
  }

  return { merged: Array.from(existingById.values()), applied, skipped };
}
