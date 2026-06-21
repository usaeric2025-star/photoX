import { lazy, Suspense } from 'react';
import type { PhotoLightboxProps } from './PhotoLightbox';

const PhotoLightboxView = lazy(() => import('./PhotoLightbox').then(m => ({ default: m.PhotoLightbox })));

export function LazyPhotoLightbox(props: PhotoLightboxProps) {
  return (
    <Suspense fallback={null}>
      <PhotoLightboxView {...props} />
    </Suspense>
  );
}
