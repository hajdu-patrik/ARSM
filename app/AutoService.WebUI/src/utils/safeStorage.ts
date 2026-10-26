/** Browser storage access that never throws: privacy mode, blocked storage and a full quota
 * all degrade to "nothing stored". See app/AutoService.WebUI/CLAUDE.md. */

export type StorageArea = 'local' | 'session';

/** Resolves a storage area; merely reading the global throws when storage is blocked. */
function resolveStorage(area: StorageArea): Storage | null {
  try {
    return area === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
  } catch {
    return null;
  }
}

/** Reads a value; `null` when the key is absent or storage is unavailable. */
export function readStorage(area: StorageArea, key: string): string | null {
  try {
    return resolveStorage(area)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Writes a value; a blocked or full storage is ignored. */
export function writeStorage(area: StorageArea, key: string, value: string): void {
  try {
    resolveStorage(area)?.setItem(key, value);
  } catch {
    // Storage blocked or quota exceeded: the value is simply not persisted.
  }
}

/** Lists the keys starting with a prefix; empty when storage is unavailable. */
export function listStorageKeys(area: StorageArea, prefix: string): string[] {
  try {
    const storage = resolveStorage(area);
    const keys: string[] = [];
    for (let index = 0; index < (storage?.length ?? 0); index += 1) {
      const key = storage?.key(index);
      if (key?.startsWith(prefix)) {
        keys.push(key);
      }
    }
    return keys;
  } catch {
    return [];
  }
}

/** Removes a key; unavailable storage is ignored. */
export function removeStorage(area: StorageArea, key: string): void {
  try {
    resolveStorage(area)?.removeItem(key);
  } catch {
    // Storage unavailable: there is nothing to remove.
  }
}
