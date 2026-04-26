import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import AppRoutes from './AppRoutes';
import { GalleryProvider } from './context/GalleryContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GalleryProvider>
      <AppRoutes />
    </GalleryProvider>
  </StrictMode>,
);
