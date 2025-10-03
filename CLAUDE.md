# Waypoints Europe - AI Assistant Instructions

## PROJECT OVERVIEW

**Goal**: Build Waypoints Europe - a travel web app for your upcoming Europe trip that highlights points of interest (POIs) with interactive popups containing descriptions and photos, accessible offline on mobile devices.

**Core Features**:
- Interactive map with POI markers
- Click-to-view popups with text descriptions and images
- Offline functionality for travel without data/WiFi
- Cross-platform compatibility (iPhone, Android, desktop, web)
- Walking tours with route visualization

**App Name**: Waypoints Europe
**Repository**: `waypoints-europe`
**Tagline**: "Your European Travel Companion"

---

## TECHNOLOGY STACK

### Core Technologies
- **PWA + React 18 + Vite 5 + Mapbox GL JS 3**
- **vite-plugin-pwa**: Automatic service worker generation with Workbox
- **Yet Another React Lightbox**: Professional image viewer
- **markdown-to-jsx**: Walking tour guide renderer

### Key Files
- `src/data/pois.json` - All POI data and walking tour definitions
- `src/components/Map.jsx` - Main map component
- `src/config/theme.js` - Centralized color scheme (#2563eb blue)

**For detailed technical architecture, see:** `/docs/architecture/technical-architecture.md`

---

## DEVELOPMENT ENVIRONMENT

### Quick Setup
```bash
# Verify versions
node --version  # Should be 18.x or higher
npm --version   # Should be 8.x or higher

# Development
npm run dev     # Start dev server

# Production
npm run build   # Build for production
npm run preview # Test production build
```

### Environment Variables
```env
VITE_MAPBOX_TOKEN=your_mapbox_access_token_here
```

**Access in code:**
```javascript
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
// NOT process.env.REACT_APP_MAPBOX_TOKEN (CRA is deprecated)
```

### Target Devices
- **iPhone**: Primary travel device (iOS Safari PWA)
- **iPad**: Secondary travel device (iPadOS Safari PWA)
- **Desktop**: Development and planning

---

## DEVELOPMENT GUIDELINES FOR CLAUDE CODE

### Teaching Approach

**Developer Background**: Python experience, new to React/PWA/web development

When providing assistance:

1. **Explain Technical Concepts Clearly**
   - Use proper technical vocabulary but define terms when first introduced
   - Explain both what something does and why it's useful
   - Balance technical accuracy with accessibility

2. **Code Explanation Style**
   ```javascript
   // ❓ CONCEPT: React functional component - a JavaScript function that returns JSX
   // 📝 EXPLANATION: Components are reusable pieces of UI that can accept data (props)
   const MyComponent = () => {
     // ❓ CONCEPT: useState hook - manages component state (data that can change)
     // 📝 EXPLANATION: Returns current value and setter function, triggers re-render when updated
     const [count, setCount] = useState(0)

     return <div>Count: {count}</div>
   }
   ```

3. **Progressive Technical Complexity**
   - Start with core concepts and build vocabulary gradually
   - Layer more advanced topics on solid foundations
   - Ensure understanding of fundamentals before introducing complex patterns
   - Provide technical context for why certain approaches are preferred

**For learning objectives and milestones, see:** `/docs/architecture/learning-guide.md`

### ⚠️ CRITICAL: Modern Development Practices

**Before suggesting any code implementation, libraries, or methods:**

1. **Always Search Current Documentation**
   - Verify that suggested libraries are not deprecated
   - Check for latest versions and current best practices
   - Confirm methods and APIs are still recommended in 2025

2. **Validate Industry Standards**
   - Check if there are newer, better alternatives to older approaches
   - Verify that suggested patterns follow current React/PWA best practices
   - Ensure compatibility with modern browser standards

3. **Use Latest Stable Versions**
   - Always recommend the most recent stable versions of dependencies
   - Avoid deprecated methods even if they still work
   - Prioritize modern approaches over legacy patterns

4. **Research Before Recommending**
   - Search for current community consensus on best practices
   - Verify examples from official documentation when possible
   - Check for any breaking changes or migration guides

**Documentation Priority:**
1. Official docs (React, Vite, Mapbox, PWA specs)
2. Current community best practices
3. Latest stable releases
4. Modern alternatives to older approaches

---

## PROJECT STRUCTURE

```
waypoints-europe/
├── public/
│   ├── manifest.json          # PWA configuration
│   ├── guides/                # Walking tour markdown guides (user-facing)
│   ├── maps/                  # Walking tour map images
│   └── images/                # POI photos
├── src/
│   ├── components/
│   │   ├── Map.jsx            # Main map component
│   │   ├── CityNavigation.jsx # City selector dropdown
│   │   ├── WalkingTourFAB.jsx # Tour floating action button
│   │   ├── WalkingTourBottomSheet.jsx # Tour details panel
│   │   ├── GuideViewer.jsx    # Markdown tour guide renderer
│   │   └── ImageLightbox.jsx  # Full-screen image viewer
│   ├── data/
│   │   └── pois.json          # POI data + walking tour definitions
│   ├── config/
│   │   └── theme.js           # Centralized color scheme
│   └── App.jsx                # Main application
├── docs/                       # Developer documentation
│   ├── architecture/           # Technical architecture & design
│   │   ├── technical-architecture.md
│   │   ├── learning-guide.md
│   │   └── technology-decisions.md
│   ├── implementation/         # How-to guides
│   │   └── walking-tour-implementation-guide.md
│   ├── reference/              # POI reference docs for tours
│   │   └── {tour-id}-pois.md  # Data source for pois.json
│   └── README.md               # Documentation index
└── package.json
```

---

## DATA STRUCTURE

### POI Object
```javascript
{
  "id": "city-poi-slug",
  "name": "POI Name",
  "coordinates": [longitude, latitude],  // Mapbox format [lng, lat]
  "category": "landmark|culture|food|practical|hotel",
  "visibility": "always|walkingTour",
  "description": "Main description",
  "walkingTourNotes": "Historical context for tours",
  "notes": "Practical tips (hours, costs)",
  "googleMapsUrl": "https://maps.app.goo.gl/xyz",
  "photos": []
}
```

### Walking Tour Object
```javascript
{
  "id": "tour-id",
  "name": "Tour Display Name",
  "description": "One-sentence summary",
  "difficulty": "easy|moderate|challenging",
  "estimatedTime": "X hours",
  "distance": "~X km",
  "mapImage": "/maps/tour-id.jpg",
  "poiSequence": ["city-poi-1", "city-poi-2"]
}
```

**⚠️ IMPORTANT Coordinate Format:**
- **In pois.json**: `[longitude, latitude]` (Mapbox GL JS format)
- **In docs**: `latitude, longitude` (human-readable format)
- **Always swap when transferring between docs and JSON!**

---

## FILE RELATIONSHIPS: GUIDE → POI REFERENCE → POIS.JSON

### Overview

Walking tour data flows through three key files, each serving a distinct purpose:

```
Rick Steves Guide     POI Reference Doc        pois.json
(Source Content)      (Developer Reference)    (App Data)
       ↓                     ↓                       ↓
/public/guides/       /docs/                   /src/data/
{tour-id}.md         {tour-id}-pois.md        pois.json
```

### 1. Walking Tour Guide (`/public/guides/{tour-id}.md`)

**Purpose**: User-facing markdown content rendered in the app's GuideViewer component

**Content**:
- Full Rick Steves walking tour narrative
- Step-by-step walking directions
- Historical context and stories
- Cultural insights and tips
- Formatted for mobile reading experience

**Format**: Markdown with headers, paragraphs, and emphasis
- Organized by numbered stops (## 1. POI Name)
- Rich narrative prose for travelers
- No structured data (coordinates, categories, etc.)

**Example**: `/public/guides/helsinki-city-walk.md`

**Usage**: Loaded dynamically by GuideViewer.jsx when user clicks "View Full Tour Guide" button

---

### 2. POI Reference Document (`/docs/{tour-id}-pois.md`)

**Purpose**: Developer reference for implementing POIs in pois.json

**Content**: Structured POI data extracted from the guide with additional metadata
- **Description**: User-facing POI summary (what it is)
- **History**: Historical context and significance (why it matters)
- **Tips**: Practical visitor information (hours, costs, what to see)
- **Coordinates**: latitude, longitude (human-readable format)
- **Google Maps**: Direct link to location
- **Visibility**: `always` or `walkingTour`
- **Category**: landmark, culture, food, practical, hotel

**Format**: Markdown with consistent structure per POI
```markdown
### 1 POI Name
- **Description**: Brief overview
- **History**: Historical background
- **Tips**: Practical information
- **Coordinates**: 60.1677083, 24.9541698
- **[Google Maps](https://maps.app.goo.gl/xyz)**
- **Visibility**: always
```

**Example**: `/docs/helsinki-city-walk-pois.md`

**Usage**:
- Reference when adding/updating POIs in pois.json
- Single source of truth for POI data
- Bridge between guide narrative and JSON structure

---

### 3. POI Data (`/src/data/pois.json`)

**Purpose**: App runtime data consumed by React components

**Content**: JSON-structured POI objects with app-specific formatting
- **description**: Main POI description (from reference doc Description)
- **walkingTourNotes**: Historical context for tours (from reference doc History)
- **notes**: Practical tips (from reference doc Tips)
- **coordinates**: [longitude, latitude] - **SWAPPED from reference doc!**
- **googleMapsUrl**: Direct from reference doc
- **visibility**: always | walkingTour
- **category**: landmark | culture | food | practical | hotel

**Format**: JSON array of POI objects
```json
{
  "id": "helsinki-market-square",
  "name": "Kauppatori - Market Square",
  "coordinates": [24.9541698, 60.1677083],
  "category": "landmark",
  "visibility": "always",
  "description": "Helsinki's main outdoor market square...",
  "walkingTourNotes": "The Czarina's Stone obelisk was the first...",
  "notes": "Explore colorful outdoor market...",
  "googleMapsUrl": "https://maps.app.goo.gl/GwVVFPTTwwcy1Xnw7",
  "photos": []
}
```

**Example**: See Helsinki POIs in `/src/data/pois.json`

**Usage**:
- Loaded by Map.jsx to render POI markers
- Powers POI popups with descriptions
- Defines walking tour sequences

---

### Data Flow: How Content Moves Between Files

**Step 1: Extract from Guide**
```
/public/guides/helsinki-city-walk.md
    ↓
Read Rick Steves narrative content
Extract POI information, history, tips
```

**Step 2: Structure in Reference Doc**
```
/docs/helsinki-city-walk-pois.md
    ↓
Organize into structured POI entries
Add coordinates (lat, lng format)
Add Google Maps links
Categorize and set visibility
```

**Step 3: Implement in JSON**
```
/src/data/pois.json
    ↓
Create JSON POI objects
**SWAP coordinates to [lng, lat]**
Map fields: Description → description
           History → walkingTourNotes
           Tips → notes
Add to city's pois array
Add to walking tour poiSequence
```

---

### Field Mapping Reference

| POI Reference Doc | pois.json Field | Notes |
|------------------|-----------------|-------|
| **Description** | `description` | User-facing summary |
| **History** | `walkingTourNotes` | Historical context |
| **Tips** | `notes` | Practical information |
| **Coordinates** (lat, lng) | `coordinates` [lng, lat] | **SWAP ORDER!** |
| **Google Maps** | `googleMapsUrl` | Direct copy |
| **Visibility** | `visibility` | always \| walkingTour |
| **Category** | `category` | landmark \| culture \| food \| practical \| hotel |

---

### Critical Coordinate Conversion

**POI Reference Doc** (Human-readable):
```markdown
- **Coordinates**: 60.1677083, 24.9541698
                   ↑ latitude  ↑ longitude
```

**pois.json** (Mapbox GL JS format):
```json
"coordinates": [24.9541698, 60.1677083]
                ↑ longitude ↑ latitude
```

**Always swap when transferring!** Mapbox requires [lng, lat] format.

---

### Best Practices

1. **Always start with POI reference doc** - Don't skip to pois.json
2. **Single source of truth** - Update reference doc, then sync to pois.json
3. **Coordinate precision** - Use exact coordinates from Google Maps (7+ decimals)
4. **Consistent structure** - Follow field mapping exactly
5. **Verify data** - Check JSON validity with `node -e "JSON.parse(...)"`
6. **Test in app** - Verify POIs appear correctly on map and in popups

---

### Example: Adding a New POI

**1. Add to POI Reference Doc** (`/docs/helsinki-city-walk-pois.md`):
```markdown
### 10 New POI
- **Description**: A stunning example of Finnish architecture
- **History**: Built in 1952 to commemorate independence
- **Tips**: Free entry, open daily 9:00-17:00
- **Coordinates**: 60.1234567, 24.9876543
- **[Google Maps](https://maps.app.goo.gl/xyz)**
- **Visibility**: walkingTour
```

**2. Implement in pois.json**:
```json
{
  "id": "helsinki-new-poi",
  "name": "New POI",
  "coordinates": [24.9876543, 60.1234567],  // SWAPPED!
  "category": "landmark",
  "visibility": "walkingTour",
  "description": "A stunning example of Finnish architecture",
  "walkingTourNotes": "Built in 1952 to commemorate independence",
  "notes": "Free entry, open daily 9:00-17:00",
  "googleMapsUrl": "https://maps.app.goo.gl/xyz",
  "photos": []
}
```

**3. Add to Walking Tour Sequence**:
```json
"poiSequence": [
  "helsinki-market-square",
  "helsinki-senate-square",
  "helsinki-new-poi"  // Add here
]
```

---

## WALKING TOUR IMPLEMENTATION

**For new walking tours, follow the standardized 8-step process:**

See complete guide: `/docs/implementation/walking-tour-implementation-guide.md`

**Quick Reference:**
1. Extract Rick Steves content → `/public/guides/{tour-id}.md`
2. Create POI reference doc → `/docs/reference/{tour-id}-pois.md`
3. Get coordinates from Google Maps
4. Update `pois.json` with POI data (convert coordinates!)
5. Add walking tour definition to `pois.json`
6. Add map image → `/public/maps/{tour-id}.jpg`
7. Test all features (FAB, bottom sheet, guide viewer, markers)
8. Document and commit

**Coordinate Conversion Critical:**
- Docs: `59.325558, 18.071073` (lat, lng)
- JSON: `[18.071073, 59.325558]` (lng, lat) - **SWAP!**

---

## DEVELOPMENT LOG

### Current Status (October 2025)

**Cities**: 6 cities with 72 POIs (Munich, Helsinki, Tallinn, Stockholm, Copenhagen, Malmö)

**Walking Tours**: 6 complete tours
- ✅ Copenhagen City Walk (22 POIs)
- ✅ Helsinki City Walk (9 POIs + 6 additional POIs)
- ✅ Tallinn Walk (4 POIs)
- ✅ Munich Historic Center (5 POIs)
- ✅ Stockholm Gamla Stan Walk (12 POIs) - **Completed Oct 2025**
- ✅ Stockholm Modern City Walk (9 POIs) - **Validated Oct 2025**

**Features**:
- ✅ PWA with offline caching (30-day cache for travel)
- ✅ Modern UI with city navigation dropdown
- ✅ Mapbox clustering and geolocation
- ✅ Walking tour system (FAB, bottom sheet, guide viewer)
- ✅ Image lightbox (YARL) with mobile gestures
- ✅ Google Maps integration for all POIs
- ✅ Production build tested on iPhone/iPad

### Setup Phase (Completed)
- [x] Create Mapbox account and get access token
- [x] Initialize Vite React project
- [x] Configure environment variables (VITE_MAPBOX_TOKEN)
- [x] Install dependencies (mapbox-gl, vite-plugin-pwa)
- [x] Configure vite.config.js with PWA settings

### Core Development (Completed)
- [x] Build Map component with Mapbox integration
- [x] Implement full-page map display
- [x] Test cross-platform compatibility (iPhone, iPad, desktop)
- [x] Configure PWA manifest and service worker
- [x] Test PWA installation and standalone mode
- [x] Create POI data structure (pois.json) with 6 European cities
- [x] Implement POI markers with click handlers
- [x] Create POIPopup component with rich content and styling
- [x] Test basic functionality across devices

### PWA Features (Completed)
- [x] Configure web app manifest with blue theme (#2563eb)
- [x] Test service worker registration
- [x] Implement offline caching strategy (30-day cache for travel)
- [x] Test PWA installation on mobile devices (iPhone/iPad)
- [x] Verify offline functionality and manual refresh capability

### POI Data Implementation (Completed - September 2025)
- [x] Add all 6 European cities: Munich, Helsinki, Tallinn, Stockholm, Copenhagen, Malmö
- [x] Implement 58 total POIs across all cities with descriptions and tips
- [x] Audit and fix coordinate accuracy issues using Google Maps data
- [x] Add "View on Google Maps" links to all POIs
- [x] Update PWA theme to consistent blue (#2563eb)
- [x] Complete coordinate updates for all cities with precision positioning

### Modern UI Implementation (Completed - September 2025)
- [x] Create modern city navigation dropdown component with 2025 UX best practices
- [x] Implement top-left positioned "Waypoints" dropdown with airport codes
- [x] Add smooth city selection and map zoom functionality
- [x] Integrate Mapbox NavigationControl with zoom in/out and compass buttons
- [x] Position navigation controls in top-right corner
- [x] Implement click-outside-to-close and touch-friendly interactions
- [x] Add country flag icons and POI count indicators to dropdown
- [x] Add geolocation control for current location tracking
- [x] Implement elegant POI markers with proper visual hierarchy
- [x] Remove popup close buttons for cleaner mobile UX
- [x] Fix iPhone safe area handling for Mapbox attribution visibility

### Walking Tour Features (Completed - September 2025)
- [x] Implement POI visibility filtering system (`always` vs `walkingTour` modes)
- [x] Add zoom-responsive POI labels with collision detection
- [x] Create Copenhagen, Helsinki, Tallinn, Munich walking tours
- [x] Add walking tour map images
- [x] Implement "Show Route" / "Hide Route" toggle buttons
- [x] Migrate to Yet Another React Lightbox (YARL) for professional mobile UX
- [x] Test mobile touch gestures and pinch-to-zoom on iPhone
- [x] Verify background scroll prevention works correctly
- [x] Install markdown-to-jsx library
- [x] Create GuideViewer.jsx component with full-screen modal display
- [x] Implement markdown rendering with custom styling matching app theme
- [x] Add "View Full Tour Guide" button to WalkingTourBottomSheet
- [x] Create walking tour markdown guides in `/public/guides/`
- [x] Organize documentation files into `/docs/` folder

### Data Cleanup & Code Review (Completed - September 2025)
- [x] Remove deprecated fields from all POIs
- [x] Comprehensive codebase review for core functionality
- [x] Validate POI data consistency across all cities
- [x] Document code quality improvements and recommendations
- [x] Standardize markdown file naming to kebab-case convention

### Stockholm Walking Tours Enhancement (Completed - October 2025)
- [x] Review and validate Stockholm Gamla Stan Walk POI reference document
- [x] Add 8 missing POIs to pois.json (Obelisk, Finnish Church, Köpmangatan, Rune Stone, Prästgatan, Viewpoint, Slussen Bridge, Golden Bridge)
- [x] Update walking tour poiSequence from 8 to 12 POIs (all numbered stops from Rick Steves guide)
- [x] Verify Stockholm Modern City Walk implementation (all 9 POIs validated)
- [x] Add walkingTourNotes field to all Stockholm POIs for historical context
- [x] Update Google Maps links and coordinates for all Stockholm POIs
- [x] Standardize POI reference document naming convention (renamed copenhagen-travel-guide.md to copenhagen-city-walk-pois.md)

### Helsinki POI Data Enhancement (Completed - October 2025)
- [x] Create comprehensive helsinki-city-walk-pois.md reference document
- [x] Merge Rick Steves guide content with user notes
- [x] Update all 9 walking tour POIs with enhanced descriptions
- [x] Add walkingTourNotes field to all Helsinki POIs (historical context from History section)
- [x] Update coordinates and Google Maps links from user notes
- [x] Add 6 additional Helsinki POIs (Old Market Hall, Sibelius Monument, Kamppi Chapel, Rock Church, Design District, Suomenlinna)
- [x] Update all POI categories and visibility settings
- [x] Document file relationships between guide, POI reference, and pois.json in CLAUDE.md

### Post-Trip Enhancement (Pending)
- [ ] Replace placeholder photos with actual travel photos
- [ ] Update descriptions with personal experiences
- [ ] Add more POIs discovered during travel
- [ ] Implement user feedback and improvements

---

## SUCCESS METRICS

- ✅ Smooth POI click interactions on mobile
- ✅ Fast popup loading with images
- ✅ Reliable offline functionality
- ✅ Professional appearance across devices
- ✅ Easy installation on iPhone home screen
- ✅ Usable during actual Europe travel

---

## ADDITIONAL DOCUMENTATION

- **Documentation Index**: `/docs/README.md` - Complete navigation guide for all documentation
- **Technical Architecture**: `/docs/architecture/technical-architecture.md`
- **Learning Guide**: `/docs/architecture/learning-guide.md`
- **Technology Decisions**: `/docs/architecture/technology-decisions.md`
- **Walking Tour Implementation**: `/docs/implementation/walking-tour-implementation-guide.md`
- **POI Reference Docs**: `/docs/reference/` - Data source for all walking tours

---

## QUICK REFERENCE

### Mapbox Optimization
```javascript
// Prevent unnecessary map reloads (saves API calls)
useEffect(() => {
  if (map.current) return // Prevent duplicate initialization
  // Initialize map only once
}, [])
```

### Theme Color
- **Primary Blue**: `#2563eb`
- **Source**: `src/config/theme.js`

### File Naming Conventions
- **Guides**: `/public/guides/{tour-id}.md` (kebab-case)
- **Maps**: `/public/maps/{tour-id}.jpg` (kebab-case)
- **POI Reference**: `/docs/reference/{tour-id}-pois.md` (kebab-case)

### Deployment
- Can be deployed to Vercel, Netlify, or GitHub Pages
- PWA works offline after first load
- 30-day cache configured for travel use

---

This approach gives you a production-ready travel companion that you can actually use during your Europe trip while serving as an excellent learning project and portfolio piece.
