import React from 'react';
import { GalleryProvider } from './GalleryContext';
import { ErrorProvider } from './ErrorContext';
import { TaskProvider } from '../hooks/useTasks';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorProvider>
      <GalleryProvider>
        <TaskProvider>
          {children}
        </TaskProvider>
      </GalleryProvider>
    </ErrorProvider>
  );
};
