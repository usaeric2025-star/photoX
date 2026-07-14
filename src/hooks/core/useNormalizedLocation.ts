import { useBrowserLocation } from "wouter/use-browser-location";
import { useCallback } from "react";

/**
 * Custom hook for trailing slash normalization (official wouter 3.x recommendation)
 * We use useBrowserLocation directly instead of useLocation to avoid infinite recursion
 * when this hook is provided to the <Router hook={...} /> component.
 * It ensures both reading and writing (navigation) use normalized paths.
 */
export const useNormalizedLocation = () => {
  const [location, setLocation] = useBrowserLocation();
  
  const normalized = location === "/" ? "/" : location.replace(/\/$/, "");
  
  const setNormalizedLocation = useCallback((to: string, options?: any) => {
    const normalizedTo = to === "/" ? "/" : to.replace(/\/$/, "");
    return setLocation(normalizedTo, options);
  }, [setLocation]);

  return [normalized, setNormalizedLocation] as [string, typeof setNormalizedLocation];
};
