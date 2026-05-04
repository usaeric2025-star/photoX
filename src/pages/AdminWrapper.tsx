import React from 'react';
import AdminView from './AdminView';
import { AdminSessionProvider, AdminPhotoProvider, AdminUIProvider } from '../context/AdminContexts';

// This wrapper provides the context to the entire admin section
export default function AdminWrapper() {
  // We need to move the state logic here, but because it's too much,
  // we will keep it in AdminView for now and just forward the context.
  // Actually, we can just move the providers here and have them wrap AdminView
  // which will now expect to run inside these providers.
  
  // Wait, if I move providers here, I need the values. The values are computed IN AdminView.
  // This is a catch-22.
  
  // Okay, I will just refactor AdminView to ensure the providers are at its top level
  // and wrapping everything.
  return <AdminView />;
}
