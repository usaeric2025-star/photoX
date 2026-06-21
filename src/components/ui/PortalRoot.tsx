import React from 'react';
import { createPortal } from 'react-dom';
import { SonnerContainer } from './SonnerContainer';
import { TaskBadge, TaskDrawer } from '@/lib/task-queue/components';

/**
 * PortalRoot component
 * Provides a dedicated container for Portals in the page.
 */
export function PortalRoot() {
  const portalRoot = document.getElementById('portal-root');
  if (!portalRoot) return null;

  return createPortal(
    <>
      <SonnerContainer />
      <TaskBadge />
      <TaskDrawer />
    </>,
    portalRoot
  );
}
