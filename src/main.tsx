import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import AppRoutes from './AppRoutes';
import { GalleryProvider } from './context/GalleryContext';
import { ErrorProvider } from './context/ErrorContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorProvider>
      <GalleryProvider>
        <AppRoutes />
      </GalleryProvider>
    </ErrorProvider>
  </StrictMode>,
);
