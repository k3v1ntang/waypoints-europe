import { serializeChangeset } from './editChangeset.js';

// Share (or download) a text file via the Web Share API where available -
// on iOS that opens the share sheet (AirDrop, Messages, Files, etc.),
// falling back to a plain download where file-sharing isn't supported
// (desktop browsers). Shared by both export functions below.
async function shareOrDownloadJson(json, filename, shareTitle) {
  const file = new File([json], filename, { type: 'application/json' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: shareTitle });
      return 'shared';
    } catch (err) {
      // User dismissed the share sheet - not an error, and no fallback wanted
      if (err.name === 'AbortError') return 'cancelled';
      console.error('Web Share failed, falling back to download:', err);
    }
  }

  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

// Export the merged POI data (bundled pois.json + on-device edits) as a
// file. The output is a drop-in replacement for src/data/pois.json when
// folding edits back into the repo - the "final snapshot" export, for
// after the trip or a big batch of edits.
export async function exportMergedPois(poisData) {
  const json = JSON.stringify(poisData, null, 2) + '\n';
  const filename = `pois-${new Date().toISOString().slice(0, 10)}.json`;
  return shareOrDownloadJson(json, filename, 'Waypoints Europe POI data');
}

// Export just the on-device edit records (a "changeset") - a handful of
// small entries, not the whole app's data, so it's easy to review and to
// merge with someone else's edits (see editChangeset.ts). This is the
// day-to-day sharing path: "send my partner what I changed today."
export async function exportEditsChangeset(edits, author) {
  const json = serializeChangeset(edits, author);
  const slug = author ? author.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : 'device';
  const filename = `waypoints-edits-${slug}-${new Date().toISOString().slice(0, 10)}.json`;
  return shareOrDownloadJson(json, filename, 'Waypoints Europe edits');
}
