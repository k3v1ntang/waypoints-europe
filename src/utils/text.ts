// Shared text helpers (Phase 5b, consolidated after code review).

/**
 * "Munich (MUC)" -> "Munich". City names in pois.json may carry an airport
 * code suffix; UI surfaces show the bare name. One implementation so the
 * bar label and the search sheet can never disagree.
 */
export const cityDisplayName = (name: string): string => name.split(' (')[0] ?? name;

/**
 * Case- and accent-insensitive fold for search matching ("cafe" finds
 * "Café"). NFD splits letters from their combining accents; the regex
 * strips the accents. Note NFD does NOT decompose ø/æ/ß - "København"
 * still needs its ø typed.
 */
export const normalizeSearchText = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
