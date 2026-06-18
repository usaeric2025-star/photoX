import React, { lazy, Suspense } from 'react';

// Use lazy loading for the heavy YarlLightbox component which includes the library and plugins
const YarlLightbox = lazy(() => import('./YarlLightbox').then(m => ({ default: m.YarlLightbox })));

interface LazyYarlLightboxProps extends React.ComponentProps<typeof import('./YarlLightbox').YarlLightbox> {}

/**
 * Lazy-loaded version of YarlLightbox to improve initial bundle size and split heavy lightbox library.
 */
export function LazyYarlLightbox(props: LazyYarlLightboxProps) {
  React.useEffect(() => {
    console.log('[LazyYarlLightbox] Rendering attempt, open:', props.open);
  }, [props.open]);

  // If not open, we can avoid even loading the lazy component if we want, 
  // but usually lazy handles this fine. We also use Suspense fallback to null.
  if (!props.open) return null;

  return (
    <Suspense fallback={null}>
      <YarlLightbox {...props} />
    </Suspense>
  );
}
