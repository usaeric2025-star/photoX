import { createRouter, createRoute, RootRoute, RouterProvider } from '@tanstack/react-router';
import { z } from 'zod';

// Mocked dependencies
const App = () => <div>Root</div>;
const Home = () => <div>Home</div>;
const PhotoDetail = () => <div>Photo Detail</div>;

const rootRoute = new RootRoute({
  component: App,
});

const indexRoute = new createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
});

const photoDetailRoute = new createRoute({
  getParentRoute: () => rootRoute,
  path: '/photo/$photoId',
  parseParams: (params) => ({
    photoId: z.string().parse(params.photoId),
  }),
  component: PhotoDetail,
});

const routeTree = rootRoute.addChildren([indexRoute, photoDetailRoute]);
export const router = createRouter({ routeTree });

/**
 * [TANSTACK-ROUTER-MIGRATION-COST]: Priority Medium.
 * - Routing logic needs complete rewrite but typesafety gained is high.
 * - Integration with Zod in params is seamless.
 */
