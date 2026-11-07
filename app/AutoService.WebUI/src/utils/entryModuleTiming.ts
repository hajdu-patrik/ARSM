/** Tells a full network load of the app from one served by the browser cache, for the first-load splash rule. */

/** The app's entry module: the last module script of the document (Vite's dev client script comes first). */
function findEntryModuleUrl(): string | null {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]');

  return scripts.length === 0 ? null : scripts.item(scripts.length - 1).src;
}

/** True when the entry module body came over the network: a first visit, a new deployment, a cleared cache
 * or a hard reload (Ctrl+Shift+R). A cache hit or a 304 revalidation transfers no full body. Unknown is false. */
export function wasEntryModuleFetchedFresh(): boolean {
  try {
    const entryUrl = findEntryModuleUrl();
    if (entryUrl === null) {
      return false;
    }

    for (const entry of performance.getEntriesByType('resource')) {
      if (entry.name === entryUrl && entry instanceof PerformanceResourceTiming) {
        return entry.encodedBodySize > 0 && entry.transferSize > entry.encodedBodySize;
      }
    }
  } catch {
    // No Resource Timing support: treat the load as a normal one, like before this rule.
  }

  return false;
}
