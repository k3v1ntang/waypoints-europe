// Export the merged POI data (bundled pois.json + on-device edits) as a
// file. Primary path is the Web Share API - on iOS that opens the share
// sheet, so the file can be AirDropped to the iPad as a mid-trip backup or
// saved to Files. Falls back to a plain download where sharing files isn't
// supported (desktop browsers). The output is a drop-in replacement for
// src/data/pois.json when folding edits back into the repo after the trip.

export async function exportMergedPois(poisData) {
  const json = JSON.stringify(poisData, null, 2) + '\n';
  const filename = `pois-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([json], filename, { type: 'application/json' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Waypoints Europe POI data'
      });
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
