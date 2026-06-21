import { useEffect, useRef } from 'react';
import { Toaster } from 'sonner';

export function SonnerContainer() {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (ref.current && !ref.current.open) {
      ref.current.show();
    }
  }, []);

  return (
    <dialog
      ref={ref}
      className="pointer-events-none bg-transparent p-0 m-0 border-none outline-none [&::backdrop]:hidden"
    >
      <div className="pointer-events-auto z-[2147483647]">
        <Toaster 
          position="bottom-center"
          richColors
          closeButton
          duration={6000}
          expand={true}
        />
      </div>
    </dialog>
  );
}
