// IndexedDB persistence for in-trip POI edits (Phase 2, decision D1:
// local-first overlay). Edits live on-device and are merged over the
// bundled pois.json at load; "Export edits" produces a merged pois.json
// to fold back into the repo after the trip.
//
// ❓ CONCEPT: IndexedDB - the browser's built-in transactional database.
// 📝 EXPLANATION: Unlike localStorage (small, synchronous, strings only),
// IndexedDB stores structured objects asynchronously and survives app
// restarts. The API is callback/event-based, so each helper below wraps
// one operation in a Promise. The store is protected from eviction by the
// navigator.storage.persist() request made in Phase 1.
//
// One record per edited POI, keyed by POI id:
//   { poiId, cityId, type: 'override' | 'new' | 'delete', poi?, updatedAt }
// - override: base POI replaced by `poi`
// - new:      POI created in-app, appended to city `cityId`
// - delete:   tombstone hiding a base POI (in-app POIs are deleted by
//             removing their 'new' record instead)

const DB_NAME = 'waypoints-edits';
const DB_VERSION = 1;
const STORE_NAME = 'poiEdits';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'poiId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Runs `operate(store)` inside a transaction and resolves with the request's
// result once the transaction commits.
async function withStore(mode, operate) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const request = operate(tx.objectStore(STORE_NAME));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export function getAllEdits() {
  return withStore('readonly', (store) => store.getAll());
}

export function putEdit(record) {
  return withStore('readwrite', (store) => store.put(record));
}

export function removeEdit(poiId) {
  return withStore('readwrite', (store) => store.delete(poiId));
}

export function clearAllEdits() {
  return withStore('readwrite', (store) => store.clear());
}
