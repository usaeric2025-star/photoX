import { Toaster } from 'sonner';

export function SonnerContainer() {
  return (
    <Toaster 
      position="top-center"
      richColors
      closeButton
      duration={6000}
      expand={true}
      toastOptions={{
        style: {
          borderRadius: '16px',
          fontFamily: 'var(--font-sans)',
        },
        className: 'shadow-lg border border-slate-100 bg-white text-slate-900',
      }}
    />
  );
}
