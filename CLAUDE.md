# Waypoints Europe - Technical Requirements Document

## 1. PROJECT OVERVIEW

### Project Summary
**Goal**: Build Waypoints Europe - a travel web app for your upcoming Europe trip that highlights points of interest (POIs) with interactive popups containing descriptions and photos, accessible offline on mobile devices.

**Core Features**:
- Interactive map with POI markers
- Click-to-view popups with text descriptions and images
- Offline functionality for travel without data/WiFi
- Cross-platform compatibility (iPhone, Android, desktop, web)

### Project Naming
**App Name**: Waypoints Europe  
**Repository**: `waypoints-europe`  
**Tagline**: "Your European Travel Companion"

**Why this name works:**
- ✅ **Simple & Clear**: Everyone understands what waypoints are
- ✅ **Memorable**: Easy to say, type, and remember  
- ✅ **Scalable**: Future expansion to `waypoints-asia`, `waypoints-americas`
- ✅ **Professional**: Sounds like a real navigation/travel tool
- ✅ **Focused**: Clearly scoped to European destinations

### Learning Objectives & Developer Background

#### Developer Profile
- **Background**: Some Python experience using Visual Studio Code with GitHub Copilot
- **New Technologies**: React, PWA (Progressive Web Apps), Claude Code
- **Learning Goal**: Use Waypoints Europe as a practical learning project for web development
- **Teaching Style**: Clear explanations with appropriate technical vocabulary, properly explained

#### Learning Approach
- **Balanced Explanations**: Use technical terms but explain them clearly
- **Technical Depth**: Include enough detail to understand concepts properly
- **Key Concepts**: Highlight and explain important React, PWA, and web development patterns
- **Tutorial Style**: Act as a tutor throughout the coding experience
- **Vocabulary Building**: Introduce technical terms with clear definitions and context

#### Specific Learning Targets

**React Fundamentals to Master**
- **Components**: Reusable UI building blocks that encapsulate HTML, CSS, and JavaScript logic
- **Hooks**: Special React functions (useState, useEffect, useRef) that add functionality to components
- **JSX**: JavaScript extension syntax that allows writing HTML-like code within JavaScript
- **Event Handling**: How components respond to user interactions (onClick, onChange, etc.)
- **State Management**: How React components store and update data that affects the UI

**PWA Concepts to Understand**
- **Service Workers**: JavaScript scripts that run in the background to enable offline functionality
- **Web App Manifest**: JSON configuration file that defines how the app appears when installed
- **Caching Strategies**: Methods for storing resources (images, data, code) for offline access
- **Installation**: How PWAs can be installed on devices like native apps

**Claude Code Development Process**
- **AI Pair Programming**: Collaborative development workflow with AI assistance
- **Iterative Development**: Building features incrementally, testing and refining each step
- **Debugging**: Systematic process of identifying and fixing code issues
- **Best Practices**: Industry-standard approaches for modern web development

## 2. TECHNOLOGY DECISIONS

### ✅ Chosen Framework: PWA + React + Vite + Mapbox

**Why This Combination:**
- **PWA**: Cross-platform (one codebase for all devices), excellent offline support, native-like experience
- **React**: Component-based architecture, great Mapbox integration, excellent ecosystem
- **Vite**: Modern, fast build tool using ESBuild for development and Rollup for production
- **Mapbox**: Superior customization, professional styling, robust offline maps, cost-effective for POCs

### ⚠️ 2025 Technology Updates

#### Deprecated Technologies to Avoid
- **Create React App (CRA)**: Officially deprecated by React team on February 14, 2025. No longer maintained and not recommended for new projects
- **Webpack as primary bundler**: While not deprecated, slower compared to modern alternatives
- **Manual service worker setup**: Modern PWA plugins handle this automatically

#### Current Best Practices (2025)
- **Vite**: Lightning-fast dev server startup and HMR using ESBuild for development and Rollup for production
- **vite-plugin-pwa**: Zero-config PWA plugin with built-in service worker generation, offline support via Workbox, and React support
- **Modern bundlers**: Vite provides optimal speed and performance for modern web development

### ❌ Alternatives Considered & Why Rejected
- **Google Maps**: More expensive, less customization, vendor lock-in
- **OpenStreetMap + Leaflet**: Too complex for professional styling, more development overhead
- **Electron**: Desktop-only, no mobile support, massive file sizes
- **React Native**: More complex setup, unnecessary for this use case

### Key Research Insights

#### PWA Market Position (2025)
- All major browsers support PWA technologies
- Industry leaders like Starbucks, Trivago showing significant engagement improvements
- Service workers and web app manifests are mature, stable technologies
- Cross-platform compatibility superior to native app development for most use cases

#### Mapbox vs Competitors
- 50% cost savings compared to Google Maps for similar functionality
- Better customization and styling options than OpenStreetMap solutions
- Robust offline capabilities specifically designed for travel applications
- Vector tiles provide superior performance and visual quality

#### Mobile Travel App Requirements
- Offline-first architecture essential for international travel
- PWA installation provides native-like experience without app store friction
- Service workers enable reliable caching of maps, images, and data
- Progressive enhancement ensures functionality across all device capabilities

## 3. DEVELOPMENT ENVIRONMENT

### System Requirements
- **Node.js Version**: 18.x or higher (required for Vite 5+)
- **Package Manager**: npm (comes with Node.js) - consistent with tutorial examples
- **Git**: For version control and project backup
- **Modern Browser**: Chrome, Firefox, Safari, or Edge (latest versions for PWA testing)

### Development Tools Setup
```bash
# Verify Node.js version
node --version  # Should be 18.x or higher

# Verify npm version
npm --version   # Should be 8.x or higher

# Check Git installation
git --version
```

### Browser Requirements for PWA Testing
- **Chrome/Edge**: Best PWA development tools and debugging
- **Safari**: Required for iOS testing (PWA behavior differs on iOS)
- **Firefox**: Good for testing cross-browser compatibility
- **Mobile browsers**: Access via phone for real device testing

### Target Mobile Devices for Travel Testing
**Primary Testing Devices for Europe Trip:**

#### iPhone (Primary Travel Device)
- **Platform**: iOS Safari (PWA support with limitations)
- **Screen sizes**: iPhone form factor (typically 6.1" - 6.7")
- **Critical features to test**:
  - PWA installation to Home Screen ("Add to Home Screen")
  - Offline functionality in airplane mode
  - GPS location services for map positioning
  - Touch interactions and gestures
  - Battery optimization during travel

#### iPad (Secondary Travel Device)  
- **Platform**: iPadOS Safari (enhanced PWA support)
- **Screen sizes**: Larger tablet format (10.9" - 12.9")
- **Usage scenarios**:
  - Trip planning and route review
  - Larger screen POI browsing
  - Backup device when iPhone battery low
  - Hotel room trip organization

### iOS-Specific PWA Considerations

#### Safari PWA Limitations (Important for Development)
- **Storage**: Limited offline storage compared to Android
- **Installation**: "Add to Home Screen" process different from Android
- **Status bar**: PWA runs in Safari container with visible URL bar
- **Notifications**: Limited push notification support
- **Background sync**: Restricted background processing

#### iOS Testing Requirements
```markdown
iOS Testing Checklist:
1. **Installation Flow**: Test "Add to Home Screen" process
2. **Offline Maps**: Verify map tiles cache properly in Safari
3. **Touch Gestures**: Ensure map zoom/pan works smoothly
4. **Orientation**: Test portrait/landscape modes
5. **Battery Impact**: Monitor power consumption during map usage
6. **Location Services**: Test GPS accuracy in different travel scenarios
```

### Mobile Testing Strategy
```markdown
Mobile Testing Approaches:
1. **Browser DevTools**: Device simulation (good for initial testing)
2. **Local Network**: Access dev server from iPhone/iPad (http://[computer-ip]:5173/)
3. **PWA Installation**: Test actual install process on both devices
4. **Offline Testing**: Airplane mode testing for offline functionality
5. **Real-world scenarios**: Test in travel conditions (low battery, poor network)
```

### Development Workflow Tools
- **Hot Module Replacement (HMR)**: Instant updates during development
- **Browser Extension**: React Developer Tools for component debugging
- **PWA Testing**: Lighthouse audits for PWA compliance
- **Network Throttling**: Simulate slow connections for travel scenarios

### Initial Environment Validation
```bash
# Test environment setup checklist
npx create-vite@latest test-project --template react
cd test-project
npm install
npm run dev  # Should open browser with working React app
```

## 4. PROJECT ARCHITECTURE

### File Structure
```
waypoints-europe/
├── public/
│   ├── manifest.json          # PWA configuration
│   ├── sw.js                  # Service worker for offline
│   └── images/                # POI photos
├── src/
│   ├── components/
│   │   ├── Map.jsx            # Main map component
│   │   ├── POIMarker.jsx      # Individual POI markers
│   │   └── POIPopup.jsx       # Popup with photos/text
│   ├── data/
│   │   └── pois.json          # POI data (coords, descriptions, photos)
│   ├── utils/
│   │   └── mapbox.js          # Mapbox configuration
│   └── App.jsx                # Main application
└── package.json
```

### Data Structure
```javascript
{
  id: 1,
  name: "Trevi Fountain",
  city: "Rome",
  coordinates: [12.4833, 41.9009],
  description: "Beautiful baroque fountain...",
  photos: ["trevi1.jpg", "trevi2.jpg"],
  tips: "Visit early morning to avoid crowds",
  category: "landmark"
}
```

### Initial Setup Commands
```bash
# Use Vite instead of deprecated Create React App
npm create vite@latest waypoints-europe -- --template react
cd waypoints-europe

# Install dependencies
npm install mapbox-gl vite-plugin-pwa -D
```

### Essential Dependencies & Configuration
```json
{
  "dependencies": {
    "react": "^18.x",
    "mapbox-gl": "^3.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "vite-plugin-pwa": "^1.x",
    "@vitejs/plugin-react": "^4.x"
  }
}
```

### Environment Variables
```env
VITE_MAPBOX_TOKEN=your_mapbox_access_token_here
```

### Accessing Environment Variables in Code
```javascript
// Vite style (correct)
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

// NOT process.env.REACT_APP_MAPBOX_TOKEN (CRA style)
```

### Vite Configuration (vite.config.js)
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Waypoints Europe',
        short_name: 'Waypoints',
        description: 'Your European Travel Companion',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
```

### Mapbox Setup Requirements
1. **Create free Mapbox account** at mapbox.com
2. **Get access token** from account dashboard
3. **Choose map style** (streets, satellite, custom)
4. **Configure offline region** for Europe destinations

### ⚠️ Mapbox API Usage & Cost Management

#### Free Tier Limits (2025)
- **50,000 map loads per month** - Each time the map initializes counts as one load
- **Free geocoding**: 100,000 requests per month
- **Free directions**: 100,000 requests per month
- **Overage charges**: Apply after free limits exceeded

#### Cost-Conscious Development Practices

**For Claude Code: Always implement with usage optimization:**

1. **Map Load Optimization**
   ```javascript
   // ❓ CONCEPT: Prevent unnecessary map reloads
   // 💰 COST IMPACT: Each map initialization = 1 API call
   useEffect(() => {
     if (map.current) return // Prevent duplicate initialization
     // Initialize map only once
   }, [])
   ```

2. **Development vs Production Tokens**
   ```env
   # Use different tokens for development and production
   VITE_MAPBOX_TOKEN_DEV=pk.your_dev_token_here
   VITE_MAPBOX_TOKEN_PROD=pk.your_production_token_here
   ```

3. **Efficient Caching Implementation**
   ```javascript
   // ❓ CONCEPT: Cache map tiles for offline use and reduced API calls
   // 💰 COST IMPACT: Reduces repeated requests for same map areas
   workbox: {
     runtimeCaching: [
       {
         urlPattern: /^https:\/\/api\.mapbox\.com/,
         handler: 'CacheFirst', // Serves from cache when available
         options: {
           cacheName: 'mapbox-cache',
           expiration: {
             maxEntries: 50,
             maxAgeSeconds: 24 * 60 * 60 // 24 hours
           }
         }
       }
     ]
   }
   ```

#### Budget Monitoring Checklist
- [ ] Set up Mapbox usage alerts at 80% of free tier
- [ ] Monitor usage weekly during development
- [ ] Use caching strategies to minimize API calls
- [ ] Test with minimal map loads during development
- [ ] Pre-download map tiles for travel areas before trip

## 5. IMPLEMENTATION ROADMAP

### Development Strategy
1. **Build web-first** with responsive design
2. **Add PWA features** (manifest, service worker)
3. **Implement offline caching** for maps and POI data
4. **Test across devices** during Europe trip
5. **Future migration path** to Electron available with minimal changes

### Phase-by-Phase Implementation

#### Phase 1: Basic Map + POI Markers
- Set up React app with Mapbox GL JS
- Create POI markers from JSON data
- Implement basic click interactions

#### Phase 2: Rich Popups
- Design popup component with photos and text
- Add smooth animations and mobile-friendly UX
- Implement image carousel functionality

#### Phase 3: PWA Features
- Add web app manifest for installation
- Implement service worker for offline caching
- Test offline functionality thoroughly

#### Phase 4: Travel Optimization
- Pre-cache map tiles for Europe destinations
- Optimize images for mobile data usage
- Add error handling and loading states

### Learning Milestones

#### Milestone 1: React Fundamentals
- [ ] Understand component architecture and JSX syntax
- [ ] Learn props (component inputs) and state (component data)
- [ ] Master event handling patterns and React's synthetic events
- [ ] Understand component lifecycle and re-rendering concepts

#### Milestone 2: Advanced React Patterns
- [ ] Master useEffect hook for side effects and lifecycle management
- [ ] Learn useRef for DOM manipulation and persistent values
- [ ] Understand conditional rendering and list rendering patterns
- [ ] Learn component composition and data flow patterns

#### Milestone 3: PWA Architecture
- [ ] Understand Progressive Web App principles and benefits
- [ ] Learn service worker registration and caching strategies
- [ ] Master web app manifest configuration and installation flow
- [ ] Understand offline-first architecture and data synchronization

#### Milestone 4: Integration & Production
- [ ] Learn third-party library integration patterns (Mapbox SDK)
- [ ] Understand performance optimization techniques and best practices
- [ ] Master debugging workflows and browser developer tools
- [ ] Learn deployment strategies and production considerations

### Success Metrics for POC
- ✅ Smooth POI click interactions on mobile
- ✅ Fast popup loading with images
- ✅ Reliable offline functionality
- ✅ Professional appearance across devices
- ✅ Easy installation on iPhone home screen
- ✅ Usable during actual Europe travel

### Next Steps for Development
1. **Set up Mapbox account** and get access token
2. **Initialize React PWA project** with Vite
3. **Create basic map component** with sample POI data
4. **Implement popup functionality** with test content
5. **Add PWA manifest and service worker**
6. **Test offline capabilities** before travel

### Future Expansion Opportunities
- **Content Management**: Add ability to edit POIs during travel
- **Social Features**: Share POIs with other travelers
- **Route Planning**: Connect POIs with walking routes
- **Categories**: Filter POIs by type (food, sights, shopping)
- **Desktop Version**: Easy migration to Electron if needed

## 6. DEVELOPMENT GUIDELINES

### For Claude Code: Teaching Approach
When providing assistance, please:

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

3. **Learning Focus Areas**
   - Introduce technical terms with clear definitions
   - Explain the reasoning behind coding patterns and conventions
   - Connect concepts to the bigger picture of web development
   - Highlight when and why to use different approaches

4. **Progressive Technical Complexity**
   - Start with core concepts and build vocabulary gradually
   - Layer more advanced topics on solid foundations
   - Ensure understanding of fundamentals before introducing complex patterns
   - Provide technical context for why certain approaches are preferred

5. **Learning Checkpoints**
   After implementing each major feature, explain:
   - Technical concepts demonstrated and their definitions
   - How the implementation follows React/PWA best practices
   - The role this feature plays in the overall application architecture
   - Next technical concepts we'll encounter and their importance

### ⚠️ CRITICAL: Modern Development Practices

#### Mandatory Online Validation Requirement
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

#### Modern Development Learning Goals
- **Learn current industry standards**, not outdated practices
- **Use modern tooling and approaches** that are relevant in 2025
- **Understand why** certain older methods are deprecated
- **Build skills** that transfer to professional development environments

#### Documentation Priority Order
1. **Official documentation** (React, Vite, Mapbox, PWA specs)
2. **Current community best practices** (GitHub discussions, recent articles)
3. **Latest stable releases** and changelogs
4. **Modern alternatives** to older approaches

**Example Validation Process:**
```
Before suggesting: "Use componentDidMount for lifecycle"
✅ RESEARCH: Check if this is current best practice
✅ DISCOVER: useEffect is the modern hook-based approach
✅ RECOMMEND: useEffect with proper explanation of why it's preferred
✅ EXPLAIN: Why componentDidMount is legacy (class-based components)
```

## 7. DEVELOPMENT LOG

### Setup Phase
- [x] Create Mapbox account and get access token
- [x] Initialize Vite React project
- [x] Configure environment variables (VITE_MAPBOX_TOKEN)
- [x] Install dependencies (mapbox-gl, vite-plugin-pwa)
- [x] Configure vite.config.js with PWA settings

### Core Development  
- [x] Build Map component with Mapbox integration
- [x] Implement full-page map display
- [x] Test cross-platform compatibility (iPhone, iPad, desktop)
- [x] Configure PWA manifest and service worker
- [x] Test PWA installation and standalone mode
- [x] Create POI data structure (pois.json) with 6 European cities
- [x] Implement POI markers with click handlers
- [x] Create POIPopup component with rich content and styling
- [x] Test basic functionality across devices

### PWA Features
- [x] Configure web app manifest with blue theme (#2563eb)
- [x] Test service worker registration  
- [x] Implement offline caching strategy (30-day cache for travel)
- [x] Test PWA installation on mobile devices (iPhone/iPad)
- [x] Verify offline functionality and manual refresh capability

### POI Data Implementation (September 2025)
- [x] Add all 6 European cities: Munich, Helsinki, Tallinn, Stockholm, Copenhagen, Malmö
- [x] Implement 25 total POIs across all cities with descriptions and tips
- [x] Audit and fix coordinate accuracy issues using Google Maps data
- [x] Add Munich POI coordinates with precision Google Maps data
- [x] Add "View on Google Maps" links to Munich POIs
- [x] Update PWA theme to consistent blue (#2563eb) matching refresh button
- [x] Update refresh button icon from emoji to clean white arrow (↻)
- [x] Complete coordinate updates for remaining cities (Helsinki, Tallinn, Stockholm, Copenhagen, Malmö)

### Modern UI Implementation (September 2025)
- [x] Remove refresh button and clean up unnecessary code
- [x] Create modern city navigation dropdown component with 2025 UX best practices
- [x] Implement top-left positioned "Waypoints" dropdown with airport codes
- [x] Add smooth city selection and map zoom functionality
- [x] Integrate Mapbox NavigationControl with zoom in/out and compass buttons
- [x] Position navigation controls in top-right corner following industry standards
- [x] Implement click-outside-to-close and touch-friendly interactions
- [x] Add country flag icons and POI count indicators to dropdown
- [x] Add geolocation control for current location tracking with live updates
- [x] Implement elegant POI markers with proper visual hierarchy
- [x] Remove popup close buttons for cleaner mobile UX
- [x] Optimize "All Cities" dropdown text for single-line display
- [x] Align city navigation with Mapbox controls positioning
- [x] Fix iPhone safe area handling for Mapbox attribution visibility

### Travel Preparation
- [x] Add actual Europe destinations to POI data (33 POIs across 6 cities)
- [x] Optimize for mobile touch interactions and responsive design
- [x] Test on iPhone/iPad with successful PWA installation
- [x] Pre-cache map tiles strategy (30-day cache window)
- [x] Complete Google Maps coordinate accuracy for all cities with precision positioning
- [x] Troubleshoot and fix Stockholm coordinate alignment issues
- [x] Final testing and validation before Europe trip

### Walking Tour Features (September 29, 2025)
- [x] Implement POI visibility filtering system (`always` vs `walkingTour` modes)
- [x] Add zoom-responsive POI labels with collision detection
- [x] Create Copenhagen City Walk tour with route visualization
- [x] Add walking tour map image (`/public/maps/copenhagen-city-walk.jpg`)
- [x] Implement "Show Route" / "Hide Route" toggle buttons
- [x] Add custom ImageLightbox component with touch gestures
- [x] Research and evaluate modern lightbox solutions
- [x] Document decision to migrate to Yet Another React Lightbox
- [x] Replace custom ImageLightbox with YARL implementation
- [x] Update walking tour map to always show (no route activation required)
- [x] Test mobile touch gestures and pinch-to-zoom on iPhone
- [x] Verify background scroll prevention works correctly

### Current Status (September 29, 2025)
- **All Cities**: ✅ Complete with accurate coordinates and Google Maps links
- **Stockholm**: ✅ Precision-corrected coordinates with perfect marker alignment
- **Copenhagen**: ✅ Expanded to 17 POIs with comprehensive travel information
- **Tallinn**: ✅ 8 POIs with updated coordinates and new Carved Stone Museum
- **Helsinki**: ✅ 8 POIs with Google Maps integration maintained
- **Malmö**: ✅ Updated Turning Torso coordinates
- **Munich**: ✅ Complete with accurate coordinates and Google Maps links
- **PWA Features**: ✅ Fully functional with blue theme and offline capability
- **Production Build**: ✅ Live and tested on mobile devices
- **Modern UI**: ✅ Professional city navigation and map controls implemented
- **Geolocation**: ✅ Current location tracking with direction indicator
- **User Experience**: ✅ Clean popups, optimized text, aligned controls
- **iPhone Compatibility**: ✅ Safe area handling for attribution visibility
- **Map Clustering**: ✅ Professional Mapbox clustering with color-coded density indicators
- **Hotel Integration**: ✅ 4 hotels with distinct red markers and Google Maps integration
- **Navigation UX**: ✅ Clean navigation interface with proper mobile optimization
- **Marker Optimization**: ✅ Reduced marker size to 9px for better mobile screen utilization
- **POI Labels**: ✅ Dynamic labels with zoom-based visibility and smart positioning
- **Walking Tours**: ✅ Copenhagen City Walk with route visualization and POI filtering
- **Image Lightbox**: ✅ Migrated to Yet Another React Lightbox with professional mobile UX

### Post-Trip Enhancement
- [ ] Replace placeholder photos with actual travel photos
- [ ] Update descriptions with personal experiences
- [ ] Add more POIs discovered during travel
- [ ] Implement user feedback and improvements

### Technical Architecture

#### Core Components
- **Theme Configuration**: `src/config/theme.js` - Centralized color scheme and component styling
- **Primary Color**: `#2563eb` (professional blue) - documented in theme config for consistency
- **Navigation Component**: `src/components/CityNavigation.jsx` - Modern dropdown with 2025 UX patterns
- **Map Controls**: Integrated Mapbox NavigationControl for zoom/compass functionality
- **Coordinate Format**: `[longitude, latitude]` for Mapbox GL JS compatibility

#### Image Lightbox Implementation
- **Library**: [Yet Another React Lightbox](https://yet-another-react-lightbox.com) v3.25.0
- **License**: MIT (completely free for personal and commercial use)
- **Component**: `src/components/ImageLightbox.jsx` (wrapper around YARL)
- **Bundle Impact**: ~20-30 KB gzipped with zoom plugin
- **Security**: Zero dependencies, no known vulnerabilities (Snyk verified)
- **Weekly Downloads**: ~195k (most popular modern React lightbox solution)

**Key Features:**
- ✅ **Professional mobile touch support** - Pinch-to-zoom, double-tap, swipe gestures
- ✅ **Prevents background scroll** - Built-in NoScroll module handles iOS Safari quirks
- ✅ **Plugin architecture** - Zoom functionality via optional plugin
- ✅ **TypeScript built-in** - Type definitions included
- ✅ **Active maintenance** - Updated regularly (last update: 2 months ago)
- ✅ **React 18/17/16.8+ compatible** - Modern hooks-based implementation
- ✅ **Responsive images** - Automatic resolution switching with srcset/sizes

**Why YARL over custom implementation:**
1. **Battle-tested**: Used by 12,900+ projects, eliminating edge cases
2. **Zero dependencies**: No supply chain security risks
3. **Mobile-first**: Handles iOS Safari quirks, momentum scrolling, touch events properly
4. **Maintained**: Professional team vs. custom code maintenance burden
5. **Standards-compliant**: Follows 2025 React best practices and accessibility guidelines

**Usage Pattern:**
- Thumbnail preview in `WalkingTourBottomSheet.jsx`
- Full-screen lightbox opens on tap with zoom capabilities
- Integration with walking tour map images in `/public/maps/`

### Development Notes
- **Environment variable**: `VITE_MAPBOX_TOKEN` (not `REACT_APP_MAPBOX_TOKEN`)
- **Target**: Europe trip for real-world testing
- **Focus**: Offline-first, mobile-friendly, professional appearance
- **Deployment**: Can be deployed to Vercel, Netlify, or GitHub Pages
- **Future**: Easy migration path to Electron for desktop features if needed
- **UI Framework**: Following 2025 mobile-first design patterns with touch-friendly interactions

---

This approach gives you a production-ready travel companion that you can actually use during your Europe trip while serving as an excellent portfolio piece and foundation for future enhancements.