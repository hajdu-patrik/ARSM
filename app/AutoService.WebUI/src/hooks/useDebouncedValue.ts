import { useEffect, useState } from 'react';

/** Returns the value after it stayed unchanged for the delay. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => { setDebounced(value); }, delayMs);
    return () => { clearTimeout(timer); };
  }, [value, delayMs]);

  return debounced;
}
