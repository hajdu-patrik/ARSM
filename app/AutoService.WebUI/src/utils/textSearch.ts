/** Shared text-search normalization: accent/diacritic- and case-insensitive matching,
 * reused across list search features (Customers, Admin mechanic list). */

/** Removes accents and lowercases input to support accent-insensitive search. */
export function normalizeSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** A run of the original text, flagged when it matches the search query. */
export interface HighlightSegment {
  text: string;
  matched: boolean;
}

const COMBINING_MARK = /[\u0300-\u036f]/;

/** Normalizes the text per code point, keeping for every normalized unit the original span it came from. */
function buildNormalizedIndex(text: string): { normalized: string; starts: number[]; ends: number[] } {
  let normalized = '';
  const starts: number[] = [];
  const ends: number[] = [];
  let index = 0;

  for (const char of text) {
    const end = index + char.length;
    const part = normalizeSearchValue(char);
    for (let offset = 0; offset < part.length; offset += 1) {
      starts.push(index);
      ends.push(end);
    }
    normalized += part;
    index = end;
  }

  return { normalized, starts, ends };
}

/** Splits text into matched and plain runs for a query; matching ignores case and accents and maps back to original indices. */
export function highlightSegments(text: string, query: string): HighlightSegment[] {
  const needle = normalizeSearchValue(query.trim());
  if (needle === '' || text === '') {
    return [{ text, matched: false }];
  }

  const { normalized, starts, ends } = buildNormalizedIndex(text);
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  let from = 0;

  for (;;) {
    const found = normalized.indexOf(needle, from);
    if (found === -1) {
      break;
    }

    const start = Math.max(starts[found] ?? cursor, cursor);
    let end = ends[found + needle.length - 1] ?? text.length;
    while (end < text.length && COMBINING_MARK.test(text.charAt(end))) {
      end += 1;
    }

    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), matched: false });
    }
    segments.push({ text: text.slice(start, end), matched: true });
    cursor = end;
    from = found + needle.length;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), matched: false });
  }

  return segments.length > 0 ? segments : [{ text, matched: false }];
}
