import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// One-time cleanup of the runtime cache left behind by the Mapbox ->
// MapLibre migration (Phase 1, July 2026). Workbox never deletes a named
// runtime cache on its own once the route referencing it is removed.
// `caches` is undefined outside secure contexts (e.g. testing over plain
// HTTP on the local network), so guard its existence before using it.
if (typeof caches !== 'undefined' && !localStorage.getItem('waypoints-mapbox-cache-cleaned')) {
  caches.delete('mapbox-cache').finally(() => {
    try {
      localStorage.setItem('waypoints-mapbox-cache-cleaned', '1');
    } catch {
      // localStorage unavailable (e.g. Safari private mode) - harmless,
      // just means the cleanup attempt repeats on future loads.
    }
  });
}

// Ask the browser not to evict the offline tile cache (and, later, IndexedDB
// edits) under storage pressure. Best-effort: browsers may still decline.
if (navigator.storage?.persist) {
  navigator.storage.persist().then((granted) => {
    if (!granted) {
      console.warn('Persistent storage not granted; offline cache may be evicted under storage pressure.');
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
