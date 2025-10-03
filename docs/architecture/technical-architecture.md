# Technical Architecture

This document details the technical implementation of Waypoints Europe.

## Technology Stack

### Core Technologies
- **Frontend Framework**: React 18.x
- **Build Tool**: Vite 5.x (ESBuild for dev, Rollup for production)
- **PWA Plugin**: vite-plugin-pwa 1.x (Workbox-based service worker)
- **Mapping Library**: Mapbox GL JS 3.x
- **Lightbox**: Yet Another React Lightbox (YARL) 3.25.0
- **Markdown Renderer**: markdown-to-jsx 7.7.13

### Development Environment
- **Node.js**: 18.x or higher
- **Package Manager**: npm 8.x or higher
- **Version Control**: Git

## Project Structure

```
waypoints-europe/
├── public/
│   ├── manifest.json          # PWA configuration
│   ├── guides/                # Walking tour markdown guides
│   ├── maps/                  # Walking tour map images
│   └── images/                # POI photos
├── src/
│   ├── components/
│   │   ├── Map.jsx            # Main map component with Mapbox integration
│   │   ├── CityNavigation.jsx # City selector dropdown
│   │   ├── WalkingTourFAB.jsx # Floating action button for tours
│   │   ├── WalkingTourBottomSheet.jsx # Tour details panel
│   │   ├── GuideViewer.jsx    # Markdown tour guide renderer
│   │   └── ImageLightbox.jsx  # Full-screen image viewer (YARL wrapper)
│   ├── data/
│   │   └── pois.json          # POI data with coordinates, descriptions, photos
│   ├── config/
│   │   └── theme.js           # Centralized color scheme (#2563eb blue)
│   └── App.jsx                # Main application
├── docs/                       # Developer documentation
└── package.json
```

## Core Components

### Theme Configuration
- **File**: `src/config/theme.js`
- **Primary Color**: `#2563eb` (professional blue)
- **Purpose**: Centralized color scheme for consistent styling

### Map Component
- **File**: `src/components/Map.jsx`
- **Features**:
  - Mapbox GL JS integration
  - POI markers with clustering
  - Popup rendering with rich content
  - Walking tour route visualization
  - Geolocation tracking
- **Coordinate Format**: `[longitude, latitude]` (Mapbox GL JS standard)

### City Navigation
- **File**: `src/components/CityNavigation.jsx`
- **Features**:
  - Modern dropdown with 2025 UX patterns
  - Country flags and POI count indicators
  - Click-outside-to-close functionality
  - Touch-friendly interactions
  - Airport code display

### Walking Tour System
**Components:**
1. **WalkingTourFAB.jsx** - Floating action button with tour count badge
2. **WalkingTourBottomSheet.jsx** - Tour details with map preview
3. **GuideViewer.jsx** - Full-screen markdown renderer

**Data Flow:**
- Tours defined in `pois.json` → `walkingTours` section
- Tour metadata includes: name, description, difficulty, time, distance
- POI sequence links tour stops to POI data

## Data Structure

### POI Object Schema
```javascript
{
  "id": "city-poi-slug",
  "name": "POI Name",
  "coordinates": [longitude, latitude],  // Mapbox format
  "category": "landmark|culture|food|practical|hotel",
  "visibility": "always|walkingTour",
  "description": "Main description",
  "walkingTourNotes": "Historical context for tours",
  "notes": "Practical tips (hours, costs, recommendations)",
  "googleMapsUrl": "https://maps.app.goo.gl/xyz",
  "photos": []
}
```

### Walking Tour Schema
```javascript
{
  "id": "tour-id",
  "name": "Tour Display Name",
  "description": "One-sentence summary",
  "difficulty": "easy|moderate|challenging",
  "estimatedTime": "X hours",
  "distance": "~X km",
  "mapImage": "/maps/tour-id.jpg",
  "poiSequence": ["city-poi-1", "city-poi-2", "..."]
}
```

## Image Lightbox Implementation

### Library: Yet Another React Lightbox (YARL)
- **Version**: 3.25.0
- **License**: MIT (free for personal/commercial use)
- **Bundle Size**: ~20-30 KB gzipped with zoom plugin
- **Security**: Zero dependencies, no known vulnerabilities
- **Weekly Downloads**: ~195k (most popular React lightbox)

### Key Features
- ✅ Professional mobile touch support (pinch-to-zoom, double-tap, swipe)
- ✅ Prevents background scroll (built-in NoScroll module)
- ✅ Plugin architecture (zoom functionality via optional plugin)
- ✅ TypeScript built-in
- ✅ Active maintenance
- ✅ React 18/17/16.8+ compatible
- ✅ Responsive images with srcset/sizes

### Why YARL?
1. **Battle-tested**: Used by 12,900+ projects
2. **Zero dependencies**: No supply chain security risks
3. **Mobile-first**: Handles iOS Safari quirks properly
4. **Maintained**: Professional team vs. custom code burden
5. **Standards-compliant**: Follows 2025 React best practices

### Usage
- Thumbnail preview in `WalkingTourBottomSheet.jsx`
- Full-screen lightbox with zoom on tap
- Integration with walking tour map images

## Guide Viewer Implementation

### Library: markdown-to-jsx
- **Version**: 7.7.13
- **License**: MIT
- **Bundle Size**: ~8 KB gzipped
- **Purpose**: Full-screen markdown renderer for walking tours

### Key Features
- ✅ Custom markdown styling (matches blue theme)
- ✅ Mobile-responsive typography
- ✅ Keyboard navigation (ESC to close)
- ✅ Click-outside to close
- ✅ Offline-ready (cached by PWA service worker)
- ✅ Loading and error states

### Integration
- Button in `WalkingTourBottomSheet.jsx` opens guide viewer
- Fetches markdown from `/public/guides/{cityId}.md`
- Custom styling for headings, paragraphs, links, lists

## PWA Configuration

### Service Worker
- **Plugin**: vite-plugin-pwa with Workbox
- **Strategy**: CacheFirst for Mapbox tiles
- **Cache Duration**: 30 days (optimized for travel)
- **Offline Support**: Maps, POI data, images, guides

### Web App Manifest
- **Name**: Waypoints Europe
- **Short Name**: Waypoints
- **Theme Color**: #2563eb (blue)
- **Installation**: "Add to Home Screen" on iOS/Android
- **Icons**: 192x192 PNG for PWA installation

## Mapbox Integration

### Configuration
- **Access Token**: `VITE_MAPBOX_TOKEN` environment variable
- **Map Style**: Mapbox streets
- **Controls**: NavigationControl (zoom, compass, geolocation)

### Cost Optimization
- **Free Tier**: 50,000 map loads/month
- **Optimization**:
  - Prevent unnecessary map reloads (useEffect dependency check)
  - CacheFirst strategy for map tiles
  - Single map instance per session

### Features
- Custom POI markers (9px circles for mobile)
- Cluster visualization (color-coded by density)
- Popup rendering with rich content
- Geolocation with direction indicator
- Zoom-responsive POI labels

## Environment Variables

```env
VITE_MAPBOX_TOKEN=your_mapbox_access_token_here
```

**Access in code:**
```javascript
// Vite style (correct)
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

// NOT process.env.REACT_APP_MAPBOX_TOKEN (CRA style - deprecated)
```

## Build & Deployment

### Development
```bash
npm run dev  # Vite dev server on port 5173
```

### Production Build
```bash
npm run build    # Build with Vite
npm run preview  # Test production build locally
```

### Deployment Options
- Vercel (recommended for PWA)
- Netlify
- GitHub Pages
- Any static hosting service

## Browser Compatibility

### PWA Support
- **Chrome/Edge**: Full PWA support
- **Safari (iOS)**: PWA support with limitations
- **Firefox**: Full PWA support

### iOS-Specific Considerations
- Limited offline storage vs. Android
- "Add to Home Screen" installation flow
- Status bar visible in PWA mode
- Limited push notification support
- Restricted background sync

## Performance Optimizations

1. **Map Load**: Single initialization per session
2. **Caching**: Aggressive caching for offline travel use
3. **Image Optimization**: Target <1 MB for map images
4. **Bundle Size**: YARL + markdown-to-jsx = ~30 KB combined
5. **Marker Rendering**: 9px circles for mobile screen efficiency

## Development Notes

- **Coordinate Format**: Always `[longitude, latitude]` in code (Mapbox standard)
- **Documentation Format**: `latitude, longitude` in markdown docs (human-readable)
- **Offline-First**: Service worker caches all critical resources
- **Mobile-First**: Touch-friendly interactions, responsive design
- **iPhone Safe Areas**: Proper handling for attribution visibility
