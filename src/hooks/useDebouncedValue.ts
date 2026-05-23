import { useEffect, useState } from "react";

// Returns `value` after it has held steady for `delay` ms. The hook keeps
// the debounced copy in state so re-renders pick up the new value as soon
// as the timer fires.
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
