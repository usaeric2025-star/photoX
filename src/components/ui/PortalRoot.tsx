import React from 'react';

/**
 * PortalRoot component
 * Provides a dedicated container for Portals in the page.
 * Physically appended to the root layer to guarantee layering order.
 */
export function PortalRoot() {
  return (
    <div id="portal-root" className="absolute top-0 left-0 w-full" style={{ pointerEvents: 'none' }} />
  );
}
