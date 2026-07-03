import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

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
