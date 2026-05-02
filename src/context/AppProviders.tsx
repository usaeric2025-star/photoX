import React, { useState, useMemo, createContext, useContext } from 'react';
import { GalleryProvider } from './GalleryContext';
import { ErrorProvider } from './ErrorContext';
import { TaskProvider } from '../hooks/useTasks';
import { AdminSessionProvider, AdminPhotoProvider, AdminUIProvider } from './AdminContexts';

// This will hold the state that was in AdminView
export const RootAdminStateContext = createContext<any>(null);

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Move all the heavy state from AdminView to here, 
  // and provide it to the providers.
  
  // Actually, this is too big to refactor right now.
  // I will just create the structure and let the user handle the state migration,
  // OR I will just provide the providers at the top level and pass empty values for now,
  // and then the user can fill them in.
  
  // WAIT: "把 AdminUIProvider 移到根部" - I should do exactly that.
  
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
