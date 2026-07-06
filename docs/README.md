# Documentation

This folder contains all developer documentation for the Waypoints Europe project, organized by content type.

## 📁 Folder Structure

### [`/architecture`](./architecture/)
**Technical architecture and system design documentation**

- [`technical-architecture.md`](./architecture/technical-architecture.md) - Complete technical architecture overview, tech stack, and system design
- [`technology-decisions.md`](./architecture/technology-decisions.md) - Key technology choices and rationale, including the July 2026 modernization
- [`learning-guide.md`](./architecture/learning-guide.md) - React/PWA/TypeScript learning objectives and milestones
- [`design-system.md`](./architecture/design-system.md) - Design tokens, the glass material system, z-order ladder, motion, and the iOS 26 `position: fixed` rule

### [`/implementation`](./implementation/)
**How-to guides and implementation procedures**

- [`walking-tour-implementation-guide.md`](./implementation/walking-tour-implementation-guide.md) - Step-by-step guide for adding new walking tours
- [`photo-pipeline-guide.md`](./implementation/photo-pipeline-guide.md) - Step-by-step guide for adding POI photos (`scripts/process-photos.js`)
- [`city-data-contract.md`](./implementation/city-data-contract.md) - Data shape expected from the external trip-research project for Amsterdam + Paris Disneyland (Phase 4 handoff)
- [`operations-runbook.md`](./implementation/operations-runbook.md) - Deploy/rollback, CI gates, offline caching design, PWA update path, edit backup/restore, and current watch items

### [`/planning`](./planning/)
**Project plans and improvement roadmaps**

- [`MEMORY.md`](./planning/MEMORY.md) - **Current state snapshot** (active project, status, freeze dates, open items) — start here for "where are we"
- [`README.md`](./planning/README.md) - How the planning system works (plan files, session notes, orchestration conventions)
- [`2026-07-02-trip-improvement-plan.md`](./planning/2026-07-02-trip-improvement-plan.md) - August 2026 trip (Amsterdam + Paris Disneyland): codebase assessment, offline-failure root causes, decisions, and phased plan (offline reliability, in-app POI editing, photos, trip content)
- [`2026-07-03-modernization-plan.md`](./planning/2026-07-03-modernization-plan.md) - July 2026 modernization: MapLibre migration, security hardening, dependency majors, incremental TypeScript, Liquid-Glass UX rebuild, session-by-session execution log
- [`2026-07-04-session-d-notes.md`](./planning/2026-07-04-session-d-notes.md) / [`2026-07-05-session-e-notes.md`](./planning/2026-07-05-session-e-notes.md) - Worker-session deviation notes for the UX rebuild (Phase 5a/5b)

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
- **Learning React/PWA/TypeScript?** → [`/architecture/learning-guide.md`](./architecture/learning-guide.md)
- **Styling a new surface (glass, tokens, z-index)?** → [`/architecture/design-system.md`](./architecture/design-system.md)

### For Contributors
- **Adding a new walking tour?** → [`/implementation/walking-tour-implementation-guide.md`](./implementation/walking-tour-implementation-guide.md)
- **Adding photos to a POI?** → [`/implementation/photo-pipeline-guide.md`](./implementation/photo-pipeline-guide.md)
- **Looking up POI data?** → [`/reference/`](./reference/) (organized by city/tour)
- **Deploying, rolling back, or checking offline behavior?** → [`/implementation/operations-runbook.md`](./implementation/operations-runbook.md)

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
| **Coordinates** (lat, lng) | `coordinates` [lng, lat] | **⚠️ SWAP ORDER!** MapLibre uses [lng, lat] |

## 🏗️ Project Documentation

- **Main README** → [`/README.md`](../README.md) - Project overview and setup
- **AI Assistant Guide** → [`/CLAUDE.md`](../CLAUDE.md) - Instructions for Claude Code
- **Project Roadmap** → [`/ROADMAP.md`](../ROADMAP.md) - Development roadmap
- **Travel Planning** → [`/TRAVEL_PLAN.md`](../TRAVEL_PLAN.md) - Personal travel itinerary
- **Ideas & Features** → [`/IDEAS.md`](../IDEAS.md) - Future ideas and features

---

*Last updated: July 2026 (docs synced to the MapLibre + React 19 + TypeScript + glass-UI stack)*
