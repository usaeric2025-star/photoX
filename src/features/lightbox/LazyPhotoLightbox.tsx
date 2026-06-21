import { lazy, Suspense, useEffect, useState } from 'react';
import type { PhotoLightboxProps } from './PhotoLightbox';

const PhotoLightboxView = lazy(() => import('./PhotoLightbox').then(m => ({ default: m.PhotoLightbox })));

export function LazyPhotoLightbox(props: PhotoLightboxProps) {
  const [hasOpened, setHasOpened] = useState(props.open);

  useEffect(() => {
    if (props.open) {
      setHasOpened(true);
    }
  }, [props.open]);

  if (!hasOpened && !props.open) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <PhotoLightboxView {...props} />
    </Suspense>
  );
}
