import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

// Live mirror of the OS/browser motion preference, not a one-time read: a
// candidate who has this set (or toggles it mid-interview, which some
// browser extensions let you do) gets the calmer, static presence indicator
// on the very next render rather than only on a fresh page load.
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(QUERY);
    const handleChange = () => setReduced(mql.matches);
    handleChange();
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return reduced;
}
