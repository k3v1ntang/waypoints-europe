import { useEffect } from 'react';

// Shared modal-sheet dismiss plumbing (Phase 5b, consolidated after code
// review - three components carried private copies of these effects).

/** Call onClose when Escape is pressed anywhere. `enabled` gates the
 *  listener (e.g. the editor suspends it while picking coordinates). */
export function useEscapeKey(onClose: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, enabled]);
}

/**
 * Prevent the page behind a modal sheet from scrolling while it's open.
 *
 * Saves and RESTORES the previous overflow value rather than blindly
 * resetting to '' - sheets can stack (guide viewer over the tours sheet),
 * and the naive reset let the inner sheet's cleanup unlock scrolling
 * while the outer sheet was still open (review finding).
 */
export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}
