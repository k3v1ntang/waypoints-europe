#!/usr/bin/env node
// Photo pipeline (Phase 3): source photos -> public/images/{poi-id}/*.webp
//
// Usage:
//   node scripts/process-photos.js <poi-id> <sourceFile> [sourceFile2 ...]
//
// For each source file:
//   1. HEIC/HEIF inputs are decoded to JPEG first via macOS's built-in
//      `sips` — sharp's bundled libvips does not decode HEIC (only AVIF).
//   2. sharp resizes to a max 1600px edge and re-encodes as WebP, iterating
//      quality downward until the file is under ~200KB.
//   3. Metadata (EXIF/GPS/ICC) is stripped: sharp omits all source metadata
//      from the output unless `.withMetadata()` is called, which this script
//      never does. Orientation is baked in via `.rotate()` (auto-orients
//      from EXIF) before that metadata is dropped.
//
// Output files land in public/images/{poi-id}/ as 1.webp, 2.webp, ... and
// the script appends their `/images/{poi-id}/N.webp` paths to that POI's
// `photos` array in src/data/pois.json (deduped, existing entries kept).
//
// This is a local dev tool (not part of the build), run manually against a
// macOS machine with source photos on disk.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const DATA_PATH = path.join(REPO_ROOT, 'src/data/pois.json');
const IMAGES_ROOT = path.join(REPO_ROOT, 'public/images');

const TARGET_BYTES = 200 * 1024;
const MAX_EDGE = 1600;
const HEIC_EXTENSIONS = new Set(['.heic', '.heif']);

function findPoiById(data, poiId) {
  for (const city of data.cities) {
    const poi = city.pois.find((p) => p.id === poiId);
    if (poi) return poi;
  }
  return null;
}

// Rewrites just the target POI's "photos" array in place, as raw text
// rather than JSON.parse + stringify. A full round-trip would silently
// renormalize every number in the file (e.g. "24.9420" -> "24.942") and
// drop the file's trailing-newline convention, producing a huge unrelated
// diff for what should be a one-POI change.
export function updatePhotosInRawText(raw, poiId, newPhotos) {
  const idMarker = `"id": "${poiId}"`;
  const idIndex = raw.indexOf(idMarker);
  if (idIndex === -1) throw new Error(`"${idMarker}" not found in pois.json text`);

  const photosKeyIndex = raw.indexOf('"photos"', idIndex);
  if (photosKeyIndex === -1) throw new Error(`No "photos" field found after POI "${poiId}"`);

  const colonIndex = raw.indexOf(':', photosKeyIndex);
  const arrayStart = raw.indexOf('[', colonIndex);

  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < raw.length; i++) {
    if (raw[i] === '[') depth++;
    else if (raw[i] === ']') {
      depth--;
      if (depth === 0) {
        arrayEnd = i;
        break;
      }
    }
  }
  if (arrayEnd === -1) throw new Error(`Unterminated "photos" array for POI "${poiId}"`);

  const lineStart = raw.lastIndexOf('\n', photosKeyIndex) + 1;
  const indent = raw.slice(lineStart, photosKeyIndex);
  const itemIndent = `${indent}  `;

  const newArrayText = newPhotos.length === 0
    ? '[]'
    : `[\n${newPhotos.map((p) => `${itemIndent}${JSON.stringify(p)}`).join(',\n')}\n${indent}]`;

  return raw.slice(0, arrayStart) + newArrayText + raw.slice(arrayEnd + 1);
}

// HEIC needs macOS's sips to decode (sharp/libvips can't). Converts to a
// temp JPEG and returns its path; caller is responsible for cleanup.
function decodeHeicToTempJpeg(sourcePath) {
  const tmpPath = path.join(tmpdir(), `waypoints-photo-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
  execFileSync('sips', ['-s', 'format', 'jpeg', sourcePath, '--out', tmpPath], { stdio: 'pipe' });
  return tmpPath;
}

// Resize + re-encode to WebP, stepping quality down until under the target
// size (or quality bottoms out — a very detailed 1600px photo may not hit
// 200KB and that's fine, it's a target not a hard cap).
async function encodeUnderTarget(inputPath, outputPath) {
  const qualities = [80, 70, 60, 50, 40];
  let lastBuffer = null;

  for (const quality of qualities) {
    const buffer = await sharp(inputPath)
      .rotate() // bake in EXIF orientation before metadata is stripped
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      // No .withMetadata() call: sharp strips EXIF/GPS/ICC by default.
      .toBuffer();

    lastBuffer = buffer;
    if (buffer.byteLength <= TARGET_BYTES) break;
  }

  writeFileSync(outputPath, lastBuffer);
  return lastBuffer.byteLength;
}

async function processOne(poiId, sourcePath, outDir, nextIndex) {
  const ext = path.extname(sourcePath).toLowerCase();
  const isHeic = HEIC_EXTENSIONS.has(ext);
  const decodedPath = isHeic ? decodeHeicToTempJpeg(sourcePath) : sourcePath;

  const outputFilename = `${nextIndex}.webp`;
  const outputPath = path.join(outDir, outputFilename);

  try {
    const bytes = await encodeUnderTarget(decodedPath, outputPath);
    console.log(`  ${path.basename(sourcePath)} -> images/${poiId}/${outputFilename} (${(bytes / 1024).toFixed(0)}KB)`);
  } finally {
    if (isHeic) rmSync(decodedPath, { force: true });
  }

  return `/images/${poiId}/${outputFilename}`;
}

async function main() {
  const [poiId, ...sourcePaths] = process.argv.slice(2);

  if (!poiId || sourcePaths.length === 0) {
    console.error('Usage: node scripts/process-photos.js <poi-id> <sourceFile> [sourceFile2 ...]');
    process.exit(1);
  }

  const rawBefore = readFileSync(DATA_PATH, 'utf-8');
  const data = JSON.parse(rawBefore);
  const poi = findPoiById(data, poiId);
  if (!poi) {
    console.error(`✖ No POI with id "${poiId}" in pois.json`);
    process.exit(1);
  }

  for (const sourcePath of sourcePaths) {
    if (!existsSync(sourcePath)) {
      console.error(`✖ Source file not found: ${sourcePath}`);
      process.exit(1);
    }
  }

  const outDir = path.join(IMAGES_ROOT, poiId);
  mkdirSync(outDir, { recursive: true });

  // Continue numbering after any photos already output for this POI, so
  // repeat runs (adding more photos later) don't clobber existing files.
  const existingCount = existsSync(outDir)
    ? readdirSync(outDir).filter((f) => /^\d+\.webp$/.test(f)).length
    : 0;

  console.log(`Processing ${sourcePaths.length} photo(s) for "${poiId}"...`);

  const newPaths = [];
  for (let i = 0; i < sourcePaths.length; i++) {
    const newPath = await processOne(poiId, sourcePaths[i], outDir, existingCount + i + 1);
    newPaths.push(newPath);
  }

  const mergedPhotos = [...new Set([...(poi.photos ?? []), ...newPaths])];
  const rawAfter = updatePhotosInRawText(rawBefore, poiId, mergedPhotos);
  writeFileSync(DATA_PATH, rawAfter);

  console.log(`✓ Updated pois.json: "${poiId}" now has ${mergedPhotos.length} photo(s)`);
}

// Only run the CLI when this file is executed directly (not when imported
// by tests) - mirrors Python's `if __name__ == "__main__":`.
const isMainModule = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
