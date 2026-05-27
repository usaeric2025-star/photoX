import { createRoute } from "@tanstack/react-router";
import { validateAccess, RouteAccessContract } from "@/shared/permissionsSchema";
import { ROUTES } from "@/config/constants";

// Assuming rootRoute is defined elsewhere
const rootRoute = {} as any;
const PlaceholderComponent = () => null;

/**
 * FEW-SHOT EXAMPLES FOR ROUTE CREATION (v2.10 Permissions Contract)
 */

// 1. PUBLIC ROUTE EXAMPLE
// High readability, no authentication wall, uses default values
export const publicShowcaseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/showcase",
  beforeLoad: ({ context }) => {
    const contract: RouteAccessContract = {
      permission: "public",
      fallbackRedirect: ROUTES.HOME
    };
    validateAccess(contract, context);
  },
  component: PlaceholderComponent
});

// 2. AUTHENTICATED (STAFF / MODERATOR) ROUTE EXAMPLE
// Restricts to authenticated users, triggers standard login fallback
export const editGalleryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/edit-gallery",
  beforeLoad: ({ context }) => {
    const contract: RouteAccessContract = {
      permission: "authenticated",
      fallbackRedirect: ROUTES.LOGIN
    };
    validateAccess(contract, context);
  },
  component: PlaceholderComponent
});

// 3. ADMINISTRATOR SPECIFIC ROUTE EXAMPLE
// Strict constraint to 'admin' role, handles redirect with descriptive trace message
export const systemBillingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/billing",
  beforeLoad: ({ context }) => {
    const contract: RouteAccessContract = {
      permission: "admin",
      fallbackRedirect: ROUTES.HOME
    };
    validateAccess(contract, context);
  },
  component: PlaceholderComponent
});
