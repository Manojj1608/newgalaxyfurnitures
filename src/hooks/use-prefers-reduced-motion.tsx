import * as React from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Defect 1.11: the hero slideshow never consulted the visitor's motion
 * preference, so it auto-rotated even when the OS explicitly asked it not to.
 *
 * Mirrors the `use-mobile.tsx` matchMedia pattern exactly: SSR-safe initial
 * `false`, subscribe on mount, clean up on unmount.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(QUERY);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    setReduced(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
