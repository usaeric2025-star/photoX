import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import AppRoutes from './AppRoutes';
import { GalleryProvider } from './context/GalleryContext';
import { ErrorProvider } from './context/ErrorContext';
import { TaskProvider } from './hooks/useTasks';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorProvider>
      <GalleryProvider>
        <TaskProvider>
          <AppRoutes />
        </TaskProvider>
      </GalleryProvider>
    </ErrorProvider>
  </StrictMode>,
);
