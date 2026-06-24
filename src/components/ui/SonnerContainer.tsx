import { Toaster } from 'sonner';
import { createPortal } from 'react-dom';

export function SonnerContainer() {
  return createPortal(
    <Toaster 
      position="top-center"
      richColors
      closeButton
      duration={6000}
      expand={true}
      style={{ zIndex: 999999 }}
      toastOptions={{
        style: {
          borderRadius: '16px',
          fontFamily: 'var(--font-sans)',
          zIndex: 999999,
        },
        className: 'shadow-lg border border-slate-100 bg-white text-slate-900',
      }}
    />,
    document.body
  );
}
