import { Toaster } from 'sonner';
import { createPortal } from 'react-dom';

export function SonnerContainer() {
  // ✅ 直接掛到 body，與 dialog 同層級
  return createPortal(
    <Toaster position="top-center" richColors closeButton />,
    document.body
  );
}
