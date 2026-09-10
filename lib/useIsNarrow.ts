'use client';

import { useEffect, useState } from 'react';

// Recharts needs a pixel width for its category axis, so responsiveness
// here means picking between two fixed widths rather than a CSS media
// query. Good enough for the phone-vs-desktop split this dashboard needs.
export function useIsNarrow(breakpoint = 640): boolean {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsNarrow(mql.matches);
    const listener = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, [breakpoint]);

  return isNarrow;
}
