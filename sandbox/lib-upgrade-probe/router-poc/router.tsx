import { 
  createRootRoute, 
  createRoute, 
  createRouter, 
  RouterProvider, 
  Outlet, 
  Link
} from '@tanstack/react-router';
import React from 'react';

// [RR-DOM-REMOVAL-VERIFIED] Part 1: Definition
// Using @tanstack/react-router instead of react-router-dom

// 1. Root Route with Layout
const rootRoute = createRootRoute({
  component: () => (
    <>
      <div className="p-2 flex gap-2">
        <Link to="/" className="[&.active]:font-bold">Home</Link>
        <Link to="/admin" className="[&.active]:font-bold">Admin</Link>
      </div>
      <hr />
      <Outlet />
    </>
  ),
});

// 2. Index Route (Public)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <div>Public Gallery Content</div>,
});

// 3. Hash Route (Public)
const hashRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/h/$hash',
  component: ({ params }: any) => <div>Viewing Hash: {params.hash}</div>,
});

// 4. Admin Route (Private)
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: () => <div>Admin Dashboard Content</div>,
});

// 5. Build Route Tree
const routeTree = rootRoute.addChildren([indexRoute, hashRoute, adminRoute]);

// 6. Create Router
export const router = createRouter({ routeTree });

// 7. Provider Component for POC
export const RouterPOC = () => (
    <div className="sandbox-wrapper p-4 border-2 border-dashed border-blue-400">
        <h3 className="text-blue-600 font-mono mb-2">Track 1: TanStack Router POC</h3>
        <RouterProvider router={router} />
    </div>
);
