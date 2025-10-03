# Walking Tour Implementation Guide

This document provides a standardized process for implementing walking tours in Waypoints Europe, based on successful Copenhagen, Helsinki, Tallinn, and Munich implementations.

**Reference Implementation:** Copenhagen City Walk (commit: e3962d6 → 5bf69d9)

## Prerequisites

- Rick Steves PDF guidebook with walking tour chapter
- Walking tour map image (scanned from guidebook or screenshot)
- Access to Google Maps for coordinate extraction
- Existing POIs in `pois.json` for the target city

---

## Process Steps

### Step 1: Extract Walking Tour Text from PDF

**Goal:** Create `/public/guides/{tour-id}.md` with complete Rick Steves walking tour content.

**Actions:**
1. User provides Rick Steves PDF file
2. Extract walking tour chapter text (preserve original Rick Steves content - DO NOT alter)
3. Create markdown file: `/public/guides/{tour-id}.md`
4. Format with markdown structure:
   ```markdown
   # {Tour Name}

   **Duration:** ~X hours
   **Start:** {Starting Point}
   **End:** {Ending Point}

   {Rick Steves introduction - unchanged}

   ## Walk Stop Index
   1. Stop Name
   2. Stop Name
   ...

   ---

   ## ① {Stop Name}
   {Rick Steves description - unchanged}
   *{Walking directions to next stop}*

   ---
   ```
5. Add numbered emoji circles (①②③④⑤⑥⑦⑧⑨⑩) for each stop
6. Use `**bold**` for key terms, `*italics*` for directions
7. Save with kebab-case naming matching tour ID

**Example:** `stockholm-gamla-stan-walk.md`

---

### Step 2: Create Curated POI Reference Document

**Goal:** Extract all POIs from Rick Steves guide into structured reference doc `/docs/{tour-id}-pois.md`

**Actions:**
1. Read through the walking tour guide (from Step 1)
2. Identify every POI mentioned by Rick Steves (major stops AND minor points)
3. Create `/docs/{tour-id}-pois.md` with template:
   ```markdown
   ### {POI Name}
   - **Description**: {2-3 sentence description from Rick Steves}
   - **History**: {Historical context from Rick Steves}
   - **Tips**: {Practical info: hours, costs, Rick Steves page ref}
   - **Coordinates**: {TO BE FILLED}
   - **[Google Maps]()** {TO BE FILLED}
   - **Visibility**: {always OR walkingTour}
   ```

**Visibility Rules:**
- **Use `always`:** POI already exists in `pois.json` OR major tourist attraction
- **Use `walkingTour`:** New POI from Rick Steves guide (not yet in pois.json) OR tour-specific detail

4. List POIs in walking tour order
5. Leave coordinates blank (filled in Step 3)

**Example:** `stockholm-gamla-stan-walk-pois.md`

---

### Step 3: Get Coordinates and Google Maps Links

**Goal:** Add geographic data to all POIs in the reference document.

**Actions:**
1. For EACH POI in `/docs/{tour-id}-pois.md`:
   - Search POI name on Google Maps
   - Right-click marker → "Copy coordinates"
   - Click "Share" → Copy short link
   - Update doc entry:
     ```markdown
     - **Coordinates**: 59.325558, 18.071073  ← lat, lng format
     - **[Google Maps](https://maps.app.goo.gl/xyz)**
     ```

**Format:** Docs use `latitude, longitude` (comma-separated, lat first)

2. Verify all POIs have both coordinates and Google Maps links
3. Test links open correct locations

---

### Step 4: Update pois.json with POI Data

**Goal:** Transfer POI data from docs into `/src/data/pois.json`

**Actions:**
1. Open `/src/data/pois.json` and `/docs/{tour-id}-pois.md`
2. Locate city in pois.json: `cities[] → find city.id`
3. For EACH POI in docs file:
   - Check if POI already exists in city's `pois` array (by name)
   - If exists: UPDATE existing entry with new fields, keep the content already existed, especially the tips section.
   - If new: CREATE new entry

4. Use this JSON structure:
   ```json
   {
     "id": "{city}-{poi-slug}",
     "name": "{POI Name}",
     "coordinates": [longitude, latitude],  ← CONVERT FORMAT!
     "category": "landmark|culture|food|practical",
     "visibility": "always|walkingTour",
     "description": "{Description from docs}",
     "walkingTourNotes": "{History from docs}",
     "notes": "{Tips from docs}",
     "googleMapsUrl": "{Google Maps link}",
     "photos": []
   }
   ```

**CRITICAL Coordinate Conversion:**
- Docs format: `59.325558, 18.071073` (lat, lng)
- JSON format: `[18.071073, 59.325558]` (lng, lat) - **SWAP ORDER!**

5. Map docs fields to JSON:
   - Description → `description`
   - History → `walkingTourNotes` (if substantial)
   - Tips → `notes`
   - Google Maps link → `googleMapsUrl`
   - Visibility → `visibility`

6. Validate JSON syntax (no trailing commas, proper quotes)

---

### Step 5: Add Walking Tour Definition

**Goal:** Define tour metadata and POI sequence in `pois.json`

**Actions:**
1. Navigate to `walkingTours` section in `pois.json` (end of file)
2. Find or create city's tour array
3. Add tour definition:
   ```json
   {
     "id": "{tour-id}",
     "name": "{Tour Display Name}",
     "description": "{One-sentence summary}",
     "difficulty": "easy|moderate|challenging",
     "estimatedTime": "{X hours}",
     "distance": "~{X km}",
     "mapImage": "/maps/{tour-id}.jpg",
     "poiSequence": [
       "{city}-{poi-1}",
       "{city}-{poi-2}",
       "{city}-{poi-3}"
     ]
   }
   ```

**Field Guidelines:**
- `id`: Match guide filename (kebab-case)
- `difficulty`: Based on terrain (easy = flat, moderate = some hills, challenging = steep)
- `estimatedTime`: From Rick Steves guide
- `distance`: Measure on Google Maps or from guidebook
- `mapImage`: Must match file in `/public/maps/`
- `poiSequence`: ALL POI IDs in walking order (both `always` and `walkingTour` POIs)

4. Verify all POI IDs in `poiSequence` exist in city's `pois` array

---

### Step 6: Add Walking Tour Map Image

**Goal:** Add visual route map to `/public/maps/{tour-id}.jpg`

**Actions:**
1. User provides scanned map from Rick Steves guidebook OR screenshot from Google Maps
2. Optimize image:
   - Format: JPG preferred
   - Dimensions: 1200-2000px width
   - File size: <1 MB (target 300-800 KB)
   - Quality: Readable text and clear route
3. Name file: `{tour-id}.jpg` (kebab-case, match tour ID exactly)
4. Save to `/public/maps/{tour-id}.jpg`
5. Verify filename matches `mapImage` field in pois.json

---

### Step 7: Testing Checklist

**Goal:** Verify walking tour works correctly.

**Actions:**
1. Start dev server: `npm run dev`
2. Test in browser:
   - [ ] FAB appears with correct tour count badge
   - [ ] Tap FAB opens bottom sheet
   - [ ] Tour card shows all metadata (name, duration, difficulty, distance)
   - [ ] Map thumbnail displays
   - [ ] Thumbnail tap opens full-screen lightbox with zoom
   - [ ] "View Full Tour Guide" button opens guide viewer
   - [ ] Guide markdown renders correctly
   - [ ] POI markers appear on map
   - [ ] `visibility: always` POIs always visible
   - [ ] `visibility: walkingTour` POIs only when tour active
   - [ ] POI popups show description + walkingTourNotes when tour active
   - [ ] Google Maps links work
   - [ ] Switching cities clears tour

3. Run production build test:
   ```bash
   npm run build
   npm run preview
   ```
   - [ ] All features work in production
   - [ ] No console errors

**Troubleshooting:**
- Map image not showing: Check filename exact match, verify path starts with `/maps/`
- POI not appearing: Verify coordinates in [lng, lat] format (not reversed)
- Guide not loading: Check filename matches tour ID, file in `/public/guides/`

---

### Step 8: Documentation & Commit

**Goal:** Document implementation and commit changes.

**Actions:**
1. Update CLAUDE.md Development Log:
   ```markdown
   ### Walking Tour Features (DATE)
   - [x] Create {City} {Tour Name} with {X} POI sequence
   - [x] Add walking tour map image (/public/maps/{tour-id}.jpg)
   - [x] Create `/public/guides/{tour-id}.md` with Rick Steves content
   - [x] Add {X} new POIs from Rick Steves to pois.json
   - [x] Test mobile UX and offline functionality
   ```

2. Commit with descriptive message:
   ```bash
   git add public/maps/{tour-id}.jpg public/guides/{tour-id}.md docs/{tour-id}-pois.md src/data/pois.json

   git commit -m "Add {City} {Tour Name} with complete implementation

   Features:
   - Create {Tour Name} with {X} POI sequence
   - Add walking tour map from Rick Steves guidebook
   - Write comprehensive markdown guide
   - Add {X} new POIs from Rick Steves

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

---

## File Structure Reference

```
/public/
  /guides/
    {tour-id}.md              ← Step 1: Rick Steves guide (user-facing)
  /maps/
    {tour-id}.jpg             ← Step 6: Route map image

/docs/
  {tour-id}-pois.md           ← Step 2-3: POI reference doc (development)

/src/data/
  pois.json                   ← Step 4-5: Update POIs and tour definition
```

## Coordinate Format Quick Reference

**In docs (`/docs/{tour-id}-pois.md`):**
```markdown
- **Coordinates**: 59.325558, 18.071073
```
Format: `latitude, longitude` (lat, lng)

**In pois.json (`/src/data/pois.json`):**
```json
"coordinates": [18.071073, 59.325558]
```
Format: `[longitude, latitude]` (lng, lat) - **SWAPPED!**

## Completed Tours

- [x] Copenhagen City Walk (22 POIs)
- [x] Helsinki City Walk (9 POIs)
- [x] Tallinn Walk (4 POIs)
- [x] Munich Historic Center (5 POIs)

## Pending Tours

- [ ] Stockholm Gamla Stan Walk (map exists: `stockholm-gamla-stan-walk.jpg`)
- [ ] Stockholm Modern City Walk (map exists: `stockholm-modern-city-walk.jpg`)
