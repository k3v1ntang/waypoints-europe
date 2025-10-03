# Technology Decisions

This document explains the technology choices made for Waypoints Europe and provides historical context for alternatives considered.

## Chosen Framework: PWA + React + Vite + Mapbox

### Why This Combination

- **PWA**: Cross-platform (one codebase for all devices), excellent offline support, native-like experience
- **React**: Component-based architecture, great Mapbox integration, excellent ecosystem
- **Vite**: Modern, fast build tool using ESBuild for development and Rollup for production
- **Mapbox**: Superior customization, professional styling, robust offline maps, cost-effective for POCs

## 2025 Technology Updates

### Deprecated Technologies to Avoid

- **Create React App (CRA)**: Officially deprecated by React team on February 14, 2025. No longer maintained and not recommended for new projects
- **Webpack as primary bundler**: While not deprecated, slower compared to modern alternatives
- **Manual service worker setup**: Modern PWA plugins handle this automatically

### Current Best Practices (2025)

- **Vite**: Lightning-fast dev server startup and HMR using ESBuild for development and Rollup for production
- **vite-plugin-pwa**: Zero-config PWA plugin with built-in service worker generation, offline support via Workbox, and React support
- **Modern bundlers**: Vite provides optimal speed and performance for modern web development

## Alternatives Considered

### Google Maps (Rejected)
- **Reasons**: More expensive, less customization, vendor lock-in
- **Cost**: 2x more expensive than Mapbox for similar features
- **Customization**: Limited map styling options
- **Decision**: Mapbox offers better value for POC and personal projects

### OpenStreetMap + Leaflet (Rejected)
- **Reasons**: Too complex for professional styling, more development overhead
- **Learning Curve**: Steeper learning curve for custom styling
- **Performance**: Slower than vector tiles for mobile devices
- **Decision**: Mapbox provides professional results with less effort

### Electron (Rejected)
- **Reasons**: Desktop-only, no mobile support, massive file sizes
- **Target Devices**: Need iPhone/iPad support for travel
- **Bundle Size**: 100+ MB vs. <5 MB for PWA
- **Decision**: PWA provides cross-platform support with smaller footprint

### React Native (Rejected)
- **Reasons**: More complex setup, unnecessary for this use case
- **Development**: Requires separate iOS/Android builds
- **App Store**: Requires app store distribution vs. instant PWA install
- **Decision**: PWA meets all requirements without native app complexity

## Key Research Insights

### PWA Market Position (2025)

- All major browsers support PWA technologies
- Industry leaders like Starbucks, Trivago showing significant engagement improvements
- Service workers and web app manifests are mature, stable technologies
- Cross-platform compatibility superior to native app development for most use cases

### Mapbox vs Competitors

- 50% cost savings compared to Google Maps for similar functionality
- Better customization and styling options than OpenStreetMap solutions
- Robust offline capabilities specifically designed for travel applications
- Vector tiles provide superior performance and visual quality

### Mobile Travel App Requirements

- Offline-first architecture essential for international travel
- PWA installation provides native-like experience without app store friction
- Service workers enable reliable caching of maps, images, and data
- Progressive enhancement ensures functionality across all device capabilities

## Mapbox API Usage & Cost Management

### Free Tier Limits (2025)

- **50,000 map loads per month** - Each time the map initializes counts as one load
- **Free geocoding**: 100,000 requests per month
- **Free directions**: 100,000 requests per month
- **Overage charges**: Apply after free limits exceeded

### Cost-Conscious Development Practices

**Map Load Optimization:**
```javascript
// Prevent unnecessary map reloads
useEffect(() => {
  if (map.current) return // Prevent duplicate initialization
  // Initialize map only once
}, [])
```

**Development vs Production Tokens:**
```env
# Use different tokens for development and production
VITE_MAPBOX_TOKEN_DEV=pk.your_dev_token_here
VITE_MAPBOX_TOKEN_PROD=pk.your_production_token_here
```

**Efficient Caching:**
```javascript
// Cache map tiles for offline use and reduced API calls
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

### Budget Monitoring Checklist

- [ ] Set up Mapbox usage alerts at 80% of free tier
- [ ] Monitor usage weekly during development
- [ ] Use caching strategies to minimize API calls
- [ ] Test with minimal map loads during development
- [ ] Pre-download map tiles for travel areas before trip

## Future Expansion Opportunities

- **Content Management**: Add ability to edit POIs during travel
- **Social Features**: Share POIs with other travelers
- **Route Planning**: Connect POIs with walking routes
- **Categories**: Filter POIs by type (food, sights, shopping)
- **Desktop Version**: Easy migration to Electron if needed (codebase already compatible)
