# Photo Pipeline Guide

This document describes the process for adding personal photos to POIs in Waypoints Europe, based on the Phase 3 implementation (`feature/poi-photos`, July 2026).

**Reference Implementation:** `scripts/process-photos.js`, verified against Helsinki Hotel U14 (single + multi-photo gallery).

## Prerequisites

- Source photos on disk (JPEG, PNG, HEIC/HEIF all supported)
- macOS (HEIC decoding shells out to the built-in `sips` command — sharp's bundled libvips does not decode HEIC)
- Target POI already exists in `src/data/pois.json`

---

## Process Steps

### Step 1: Drop source photos into `photo-inbox/`

**Goal:** Stage raw photos somewhere that never touches git.

**Actions:**
1. Copy/export photos into `photo-inbox/` at the repo root
2. This folder is gitignored (`.gitignore`: `/photo-inbox/*`, keeps `.gitkeep`) — originals may carry GPS EXIF and should never be committed directly
3. Filenames don't matter; the script doesn't read them

---

### Step 2: Run the processing script

**Goal:** Produce optimized WebP files and wire them into `pois.json`.

**Actions:**
```bash
node scripts/process-photos.js <poi-id> photo-inbox/file1.jpg photo-inbox/file2.jpg ...
```

For each source file, the script:
1. Decodes HEIC/HEIF to a temp JPEG via `sips` if needed
2. Resizes to a 1600px max edge (`fit: inside`, no upscaling)
3. Re-encodes as WebP, stepping quality 80 → 70 → 60 → 50 → 40 until under the ~200KB target (a very detailed photo may not hit the target at quality 40 — that's fine, it's a target not a hard cap)
4. Strips all EXIF/GPS/ICC metadata (sharp omits it by default unless `.withMetadata()` is called — the script never calls it), after baking in EXIF orientation first via `.rotate()`
5. Writes to `public/images/{poi-id}/N.webp`, continuing numbering after any files already there (so re-running for the same POI later adds photos instead of clobbering them)
6. Appends the new paths to that POI's `photos` array in `pois.json` via a targeted text splice — not a full JSON parse/stringify — so the diff touches only that one POI's `photos` array (no incidental number reformatting or newline-convention changes elsewhere in the file)

**Multiple photos in one call** populate the gallery in that order — `POIPopup.jsx` renders one thumbnail per array entry, and the lightbox opens to whichever thumbnail was clicked with prev/next through the rest.

---

### Step 3: Verify

**Goal:** Confirm the photos actually render before committing.

**Actions:**
1. `npm run dev`, select the POI's city, click its marker
2. Thumbnail strip should appear under the description (only when `photos.length > 0`)
3. Click a thumbnail → full-screen lightbox opens at that photo, swipe/arrow through the rest, close returns cleanly
4. Spot-check output size and stripped metadata if in doubt:
   ```bash
   ls -la public/images/{poi-id}/
   node -e "require('sharp')('public/images/{poi-id}/1.webp').metadata().then(m => console.log(m.exif, m.width, m.height))"
   ```
   `exif` should print `undefined`.

---

### Step 4: Commit

**Goal:** Land the processed photos and data change; leave the originals out.

**Actions:**
```bash
git add public/images/{poi-id}/ src/data/pois.json
git commit -m "Add photos for {POI name}"
```
`photo-inbox/` is never staged — its contents are gitignored regardless of what's in it.

**Optional cleanup:** delete the now-processed originals from `photo-inbox/` if you don't want them to accumulate; the script doesn't do this automatically.

---

## Troubleshooting

- **"No POI with id ... in pois.json"**: check the `id` field for that POI (not its name) — city files use kebab-case ids like `helsinki-hotel-u14`
- **Photo doesn't show in popup**: confirm `photos` array in `pois.json` actually has entries for that POI (re-check Step 2 ran without error) and that the dev server picked up the file change
- **HEIC input fails**: only reproduces off macOS — `sips` is macOS-only; process HEIC photos on a Mac
- **Output larger than expected**: quality bottomed out at 40 and the photo is still >200KB — acceptable, not a bug; the cap is a target

---

## File Structure Reference

```
/photo-inbox/                        ← Step 1: raw source photos (gitignored)

/public/images/
  {poi-id}/
    1.webp, 2.webp, ...              ← Step 2: processed output (committed)

/src/data/
  pois.json                          ← Step 2: photos[] array per POI (committed)
```

## Offline caching

No extra config needed — `vite.config.js`'s Workbox `globPatterns` already include `webp`/`jpg`/`jpeg` (added in Phase 1 for tour maps/guides), so anything under `public/images/` is precached automatically for offline use.
