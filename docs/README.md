# Documentation

This folder contains all developer documentation for the Waypoints Europe project, organized by content type.

## 📁 Folder Structure

### [`/architecture`](./architecture/)
**Technical architecture and system design documentation**

- [`technical-architecture.md`](./architecture/technical-architecture.md) - Complete technical architecture overview, tech stack, and system design
- [`technology-decisions.md`](./architecture/technology-decisions.md) - Key technology choices and rationale
- [`learning-guide.md`](./architecture/learning-guide.md) - React/PWA learning objectives and milestones

### [`/implementation`](./implementation/)
**How-to guides and implementation procedures**

- [`walking-tour-implementation-guide.md`](./implementation/walking-tour-implementation-guide.md) - Step-by-step guide for adding new walking tours

### [`/reference`](./reference/)
**POI reference documentation (data source for pois.json)**

Each file contains POI details extracted from Rick Steves guides with coordinates, descriptions, historical context, and practical tips:

- [`copenhagen-city-walk-pois.md`](./reference/copenhagen-city-walk-pois.md) - 22 POIs
- [`helsinki-city-walk-pois.md`](./reference/helsinki-city-walk-pois.md) - 15 POIs
- [`munich-historic-center-pois.md`](./reference/munich-historic-center-pois.md) - 7 POIs
- [`stockholm-gamla-stan-walk-pois.md`](./reference/stockholm-gamla-stan-walk-pois.md) - 12 POIs
- [`stockholm-modern-city-walk-pois.md`](./reference/stockholm-modern-city-walk-pois.md) - 9 POIs
- [`tallinn-walk-pois.md`](./reference/tallinn-walk-pois.md) - 16 POIs

**Total: 81 POIs documented**

## 📊 Documentation Flow

```
Rick Steves Guide
    ↓
/public/guides/{tour-id}.md (User-facing tour guide)
    ↓
/docs/reference/{tour-id}-pois.md (Developer POI reference)
    ↓
/src/data/pois.json (Application data)
```

## 🔍 Quick Links

### For Developers
- **Getting started?** → [`/architecture/technical-architecture.md`](./architecture/technical-architecture.md)
- **Understanding tech choices?** → [`/architecture/technology-decisions.md`](./architecture/technology-decisions.md)
- **Learning React/PWA?** → [`/architecture/learning-guide.md`](./architecture/learning-guide.md)

### For Contributors
- **Adding a new walking tour?** → [`/implementation/walking-tour-implementation-guide.md`](./implementation/walking-tour-implementation-guide.md)
- **Looking up POI data?** → [`/reference/`](./reference/) (organized by city/tour)

### For Data Management
- **POI reference docs** → [`/reference/`](./reference/)
- **User-facing tour guides** → [`/public/guides/`](../public/guides/)
- **Application data** → [`/src/data/pois.json`](../src/data/pois.json)

## 📝 Documentation Standards

### POI Reference Documents (`/reference`)
- **Format**: Markdown with structured sections (Description, History, Tips, Coordinates, Google Maps)
- **Purpose**: Developer reference for creating/updating POI data in `pois.json`
- **Coordinate Format**: `latitude, longitude` (human-readable format)
- **Source**: Rick Steves guidebooks

### Field Mapping: Reference → pois.json
| POI Reference Doc | pois.json Field | Notes |
|------------------|-----------------|-------|
| **Description** | `description` | User-facing summary |
| **History** | `walkingTourNotes` | Historical context for tours |
| **Tips** | `notes` | Practical information (hours, costs, tips) |
| **Coordinates** (lat, lng) | `coordinates` [lng, lat] | **⚠️ SWAP ORDER!** Mapbox uses [lng, lat] |

## 🏗️ Project Documentation

- **Main README** → [`/README.md`](../README.md) - Project overview and setup
- **AI Assistant Guide** → [`/CLAUDE.md`](../CLAUDE.md) - Instructions for Claude Code
- **Project Roadmap** → [`/ROADMAP.md`](../ROADMAP.md) - Development roadmap
- **Travel Planning** → [`/TRAVEL_PLAN.md`](../TRAVEL_PLAN.md) - Personal travel itinerary
- **Ideas & Features** → [`/IDEAS.md`](../IDEAS.md) - Future ideas and features

---

*Last updated: October 2025*
