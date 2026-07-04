// Shared data-layer types for POIs, cities, walking tours, and the
// IndexedDB edit-overlay records — the single source of truth for the
// shapes that flow through poiValidation, mergePois, editStore, and
// usePoiData.
//
// ❓ CONCEPT: `interface` / `type` - TypeScript's two ways to name a shape.
// 📝 EXPLANATION: Roughly like a Python TypedDict or dataclass signature,
// but purely compile-time: none of this exists in the JS that ships to the
// browser. `interface` names an object shape; `type` can name anything,
// including unions ("one of these strings/shapes") - used below for the
// enum-like fields and for EditRecord's three variants.

export type Category = 'landmark' | 'culture' | 'food' | 'practical' | 'hotel';
export type Visibility = 'always' | 'walkingTour';
export type Difficulty = 'easy' | 'moderate' | 'challenging';

export interface Poi {
  id: string;
  name: string;
  // [longitude, latitude] - a fixed-length "tuple" type, not just any
  // number[], so a third coordinate (or a swapped pair) is still only
  // caught at runtime by getCoordinateErrors, but the shape itself is
  // pinned to exactly two numbers.
  coordinates: [number, number];
  category: Category;
  visibility: Visibility;
  description: string;
  walkingTourNotes?: string;
  notes: string;
  googleMapsUrl: string;
  photos?: string[];
}

export interface City {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  centerCoordinates: [number, number];
  pois: Poi[];
}

export interface WalkingTour {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  estimatedTime: string;
  distance: string;
  mapImage?: string;
  poiSequence: string[];
}

// The full shape of src/data/pois.json.
export interface PoisData {
  cities: City[];
  walkingTours?: Record<string, WalkingTour[]>;
}

// ❓ CONCEPT: Discriminated union - a set of object shapes that share one
// "tag" field (here `type`) with a different literal value per shape.
// 📝 EXPLANATION: Once code checks `record.type === 'override'`, TypeScript
// narrows the whole object to that branch, so `record.poi` is known to
// exist (and be required) only where it actually is. Mirrors the three
// record shapes documented in editStore.ts: override/new carry a full
// `poi`, delete is a tombstone with none. The `&` below intersects the
// fields every record has with the part that actually varies by `type`,
// so poiId/cityId/updatedAt are declared once instead of three times.
export type EditRecord = {
  poiId: string;
  cityId: string;
  updatedAt: number;
} & (
  | { type: 'override'; poi: Poi }
  | { type: 'new'; poi: Poi }
  | { type: 'delete' }
);
