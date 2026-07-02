import { useContext } from 'react';
import { PhotoEditSessionContext } from './PhotoEditSession.js';

export const usePhotoEditSessionContext = () => {
  const context = useContext(PhotoEditSessionContext);

  if (!context) {
    throw new Error('usePhotoEditSessionContext must be used within a PhotoEditSessionProvider');
  }

  return context;
};
