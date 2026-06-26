import { Toaster } from 'sonner';

export function SonnerContainer() {
  return (
    <Toaster 
      position="top-center" 
      richColors 
      closeButton 
      expand={true}
      visibleToasts={6}
      theme="system"
      toastOptions={{
        style: {
          borderRadius: '16px',
          padding: '12px 16px',
          fontSize: '13px',
          fontWeight: 600,
          border: 'none',
          boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.1)',
        }
      }}
    />
  );
}
