import { useEffect, useState } from "react";

/** Delays reflecting `value` until it stops changing for `delayMs` — keeps search-as-you-type from firing a request per keystroke. */
export function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
