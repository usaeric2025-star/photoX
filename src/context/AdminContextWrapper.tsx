import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AdminSessionProvider, AdminPhotoProvider, AdminUIProvider } from '../context/AdminContexts';

export function AdminContextWrapper({ children }: { children: React.ReactNode }) {
  // Move all the heavy state from AdminView here:
  const { user, logout, loginWithGoogle } = useAuth();
  
  // NOTE: This is still complex because we need the state that was inside AdminView.
  // Actually, keeping state in AdminView and just lifting the Provider to AppRoutes
  // is hard because the Provider needs the values.
  
  // What if I just use a separate 'AdminStateProvider' that holds the state at the top level?
  
  return (
    <AdminSessionProvider value={{ ... }}>
      <AdminPhotoProvider value={{ ... }}>
         <AdminUIProvider value={{ ... }}>
           {children}
         </AdminUIProvider>
      </AdminPhotoProvider>
    </AdminSessionProvider>
  )
}
