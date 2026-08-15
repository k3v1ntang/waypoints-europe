#!/usr/bin/env -S npx tsx
// Field-diffs two or more waypoints-edits-*.json changesets against the
// current src/data/pois.json, auto-applying anything unambiguous and
// flagging only genuine value-level disagreements. See
// docs/planning/2026-08-13-agent-workflow-tooling-plan.md "Phase 2" for the
// full design rationale (D5-D8) - this file implements that spec as-is.
//
// Run via `npm run detect-edit-conflicts -- <file1.json> [<file2.json> ...]
// [--base <path>]`.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { parseChangeset } from '../src/data/editChangeset.js';
import { mergePois, poiEquals } from '../src/data/mergePois.js';
import type { EditRecord, Poi, PoisData } from '../src/data/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_BASE_PATH = path.join(__dirname, '../src/data/pois.json');

export interface SourceEdit {
  source: string;
  path: string;
  edit: EditRecord;
}
// source = changeset.author ?? basename(path); path always included too, so
// two unnamed/same-author exports stay distinguishable in a conflict report.

export type ConflictReason = 'value-conflict' | 'delete-vs-edit' | 'new-collision';
// Fixed 3-way discriminant (not freeform text) - the report renders each
// differently: field-by-field values / deleter-vs-editor / two full objects.

export interface Conflict {
  poiId: string;
  cityId: string;
  name: string;
  reason: ConflictReason;
  values: Array<{ source: string; type: EditRecord['type']; value: unknown; updatedAt: number }>;
}

export interface DetectResult {
  data: PoisData; // base, mutated only for non-conflicting poiIds
  applied: string[]; // poiIds written, one-line log
  conflicts: Conflict[];
}

// The fixed set of Poi fields this script diffs.
type DiffField =
  | 'name'
  | 'coordinates'
  | 'category'
  | 'visibility'
  | 'description'
  | 'walkingTourNotes'
  | 'notes'
  | 'googleMapsUrl'
  | 'photos'
  | 'visited';

const DIFF_FIELDS: DiffField[] = [
  'name',
  'coordinates',
  'category',
  'visibility',
  'description',
  'walkingTourNotes',
  'notes',
  'googleMapsUrl',
  'photos',
  'visited'
];

function getField(poi: Poi, field: DiffField): unknown {
  return poi[field];
}

function setField(poi: Poi, field: DiffField, value: unknown): void {
  switch (field) {
    case 'name': poi.name = value as string; break;
    case 'coordinates': poi.coordinates = value as [number, number]; break;
    case 'category': poi.category = value as Poi['category']; break;
    case 'visibility': poi.visibility = value as Poi['visibility']; break;
    case 'description': poi.description = value as string; break;
    case 'walkingTourNotes': poi.walkingTourNotes = value as string; break;
    case 'notes': poi.notes = value as string; break;
    case 'googleMapsUrl': poi.googleMapsUrl = value as string; break;
    case 'photos': poi.photos = value as string[]; break;
    // D5: never write `visited: false` - the winning value here is always
    // already normalized to a boolean (see the `firstValue` computation
    // below), so `false` means "the agreeing edits turned it off", which
    // must land as an omitted key, not an explicit `false`.
    case 'visited':
      if (value === true) poi.visited = true;
      else delete poi.visited;
      break;
  }
}

// D8/D5: absent-vs-empty is not equal under mergePois's deepEqual, so an
// edit that never touched an optional field must never look like it
// changed it. Applied before any comparison, both edit-vs-edit and
// edit-vs-base. `visited` gets the same default-value treatment as
// `photos`/`walkingTourNotes` here (D5): absent normalizes to `false`.
function normalizePoi(poi: Poi): Poi {
  return {
    ...poi,
    photos: poi.photos ?? [],
    walkingTourNotes: poi.walkingTourNotes ?? '',
    visited: poi.visited ?? false
  };
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return a === b;
}

// An edit's raw (pre-normalization) value for an optional field being
// `undefined` means this edit never touched that field - it must never
// register as a change against base, whatever base's own value is. This is
// the specific D8 case (curated walkingTourNotes surviving an edit that
// only ever meant to touch other fields).
function isChanger(field: DiffField, editPoi: Poi, basePoi: Poi): boolean {
  if (
    (field === 'photos' || field === 'walkingTourNotes' || field === 'visited') &&
    editPoi[field] === undefined
  ) {
    return false;
  }
  return !valuesEqual(getField(normalizePoi(editPoi), field), getField(normalizePoi(basePoi), field));
}

function getEditPoi(edit: EditRecord): Poi | undefined {
  return edit.type === 'delete' ? undefined : edit.poi;
}

function latestUpdatedAt(group: SourceEdit[]): number {
  return Math.max(...group.map((se) => se.edit.updatedAt));
}

export function detectAndMergeEdits(base: PoisData, sourceEdits: SourceEdit[]): DetectResult {
  const basePoiById = new Map<string, { poi: Poi; cityId: string }>();
  for (const city of base.cities) {
    for (const poi of city.pois) {
      basePoiById.set(poi.id, { poi, cityId: city.id });
    }
  }

  const groups = new Map<string, SourceEdit[]>();
  for (const se of sourceEdits) {
    const group = groups.get(se.edit.poiId);
    if (group) group.push(se);
    else groups.set(se.edit.poiId, [se]);
  }

  const applied: string[] = [];
  const conflicts: Conflict[] = [];
  const resolved: EditRecord[] = [];

  for (const [poiId, group] of groups) {
    const baseEntry = basePoiById.get(poiId);

    if (baseEntry) {
      // Branch on base presence first (D7), not edit type: a `new` edit for
      // an id that has since landed in base is the stale-forever-record
      // case (usePoiData.ts only self-heals `override` records) and is
      // treated identically to `override` here.
      const deletes = group.filter((se) => se.edit.type === 'delete');
      const edits = group.filter((se) => se.edit.type !== 'delete');

      if (deletes.length === group.length) {
        resolved.push({ poiId, cityId: baseEntry.cityId, type: 'delete', updatedAt: latestUpdatedAt(group) });
        applied.push(poiId);
        continue;
      }

      if (deletes.length > 0) {
        conflicts.push({
          poiId,
          cityId: baseEntry.cityId,
          name: baseEntry.poi.name,
          reason: 'delete-vs-edit',
          values: group.map((se) => ({
            source: se.source,
            type: se.edit.type,
            updatedAt: se.edit.updatedAt,
            value: getEditPoi(se.edit)
          }))
        });
        continue;
      }

      // No deletes. All edits carry a `poi` (override or stale-forever `new`).
      const normalizedPois = edits.map((se) => normalizePoi(getEditPoi(se.edit)!));
      const allIdentical = normalizedPois.every((p) => poiEquals(p, normalizedPois[0]!));

      if (allIdentical) {
        resolved.push({
          poiId,
          cityId: baseEntry.cityId,
          type: 'override',
          poi: getEditPoi(edits[0]!.edit)!,
          updatedAt: latestUpdatedAt(group)
        });
        applied.push(poiId);
        continue;
      }

      const winningPoi: Poi = { ...baseEntry.poi };
      const disagreeingFields: DiffField[] = [];

      for (const field of DIFF_FIELDS) {
        const changers = edits.filter((se) => isChanger(field, getEditPoi(se.edit)!, baseEntry.poi));
        if (changers.length === 0) continue;

        const firstValue = getField(normalizePoi(getEditPoi(changers[0]!.edit)!), field);
        const allAgree = changers.every((se) =>
          valuesEqual(getField(normalizePoi(getEditPoi(se.edit)!), field), firstValue)
        );

        if (allAgree) {
          setField(winningPoi, field, firstValue);
        } else {
          disagreeingFields.push(field);
        }
      }

      if (disagreeingFields.length > 0) {
        conflicts.push({
          poiId,
          cityId: baseEntry.cityId,
          name: baseEntry.poi.name,
          reason: 'value-conflict',
          values: edits.map((se) => ({
            source: se.source,
            type: se.edit.type,
            updatedAt: se.edit.updatedAt,
            value: Object.fromEntries(
              disagreeingFields.map((field) => [field, getField(normalizePoi(getEditPoi(se.edit)!), field)])
            )
          }))
        });
        continue;
      }

      resolved.push({ poiId, cityId: baseEntry.cityId, type: 'override', poi: winningPoi, updatedAt: latestUpdatedAt(group) });
      applied.push(poiId);
      continue;
    }

    // No base for this poiId (independently created on two devices). A
    // `delete` can't legitimately appear here (usePoiData.ts's deletePoi
    // only tombstones ids already in BASE_POI_IDS) - treated the same as a
    // stray `override`: an anomaly, not a case worth explaining.
    if (group.some((se) => se.edit.type !== 'new')) {
      console.warn(`⚠ "${poiId}": non-"new" edit(s) with no base counterpart - skipped, not applied.`);
      continue;
    }

    const cityId = group[0]!.edit.cityId;
    const normalizedPois = group.map((se) => normalizePoi(getEditPoi(se.edit)!));
    const allIdentical = normalizedPois.every((p) => poiEquals(p, normalizedPois[0]!));

    if (allIdentical) {
      resolved.push({
        poiId,
        cityId,
        type: 'new',
        poi: getEditPoi(group[0]!.edit)!,
        updatedAt: latestUpdatedAt(group)
      });
      applied.push(poiId);
      continue;
    }

    conflicts.push({
      poiId,
      cityId,
      name: getEditPoi(group[0]!.edit)!.name,
      reason: 'new-collision',
      values: group.map((se) => ({
        source: se.source,
        type: se.edit.type,
        updatedAt: se.edit.updatedAt,
        value: getEditPoi(se.edit)
      }))
    });
  }

  return { data: mergePois(base, resolved), applied, conflicts };
}

function parseArgs(argv: string[]): { files: string[]; basePath: string } {
  const files: string[] = [];
  let basePath = DEFAULT_BASE_PATH;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') {
      const next = argv[i + 1];
      if (!next) {
        console.error('✖ --base requires a path argument');
        process.exit(1);
      }
      basePath = path.resolve(next);
      i++;
    } else {
      files.push(argv[i]!);
    }
  }

  if (files.length === 0) {
    console.error('Usage: tsx scripts/detect-edit-conflicts.ts <file1.json> [<file2.json> ...] [--base <path>]');
    process.exit(1);
  }

  return { files, basePath };
}

function main(): void {
  const { files, basePath } = parseArgs(process.argv.slice(2));

  const sourceEdits: SourceEdit[] = [];
  for (const filePath of files) {
    let changeset;
    try {
      changeset = parseChangeset(readFileSync(filePath, 'utf-8'));
    } catch (err) {
      console.error(`✖ ${filePath}: ${(err as Error).message}`);
      process.exit(1);
    }
    const source = changeset.author ?? path.basename(filePath);
    for (const edit of changeset.edits) {
      sourceEdits.push({ source, path: filePath, edit });
    }
  }

  const base = JSON.parse(readFileSync(basePath, 'utf-8')) as PoisData;
  const result = detectAndMergeEdits(base, sourceEdits);

  if (result.applied.length > 0) {
    writeFileSync(basePath, JSON.stringify(result.data, null, 2) + '\n');
  }

  console.log(`applied: [${result.applied.join(', ')}]`);

  for (const conflict of result.conflicts) {
    console.log(`\n✖ conflict on "${conflict.poiId}" (${conflict.name}, ${conflict.cityId}) — ${conflict.reason}`);
    conflict.values.forEach((v) => {
      console.log(`  - ${v.source} [${v.type}, updatedAt ${v.updatedAt}]: ${JSON.stringify(v.value)}`);
    });
  }

  process.exit(result.conflicts.length > 0 ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
