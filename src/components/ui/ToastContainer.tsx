import React from 'react';
import { Toaster } from 'sonner';

export function ToastContainer() {
  return (
    <Toaster 
      position="bottom-center"
      toastOptions={{
        className: 'photo-toast',
        style: {
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#f8fafc',
          border: '1px solid rgba(30, 41, 59, 0.5)',
          backdropFilter: 'blur(8px)',
          borderRadius: '1rem',
          fontSize: '0.875rem',
        },
      }}
      closeButton
      richColors
    />
  );
}
