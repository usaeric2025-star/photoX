import { Toaster } from 'sonner';

export function SonnerContainer() {
  return (
    <Toaster 
      position="top-center"
      richColors
      closeButton
      duration={6000}
      expand={true}
    />
  );
}
