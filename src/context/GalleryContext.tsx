import React, { createContext } from 'react';
import { useGallery } from '../hooks/useGallery';

export const GalleryContext = createContext<ReturnType<typeof useGallery> | undefined>(undefined);

export const GalleryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useGallery();
  return <GalleryContext.Provider value={store}>{children}</GalleryContext.Provider>;
};
