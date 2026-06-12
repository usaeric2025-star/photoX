import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { type } from "arktype";
import { redirect } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

/**
 * [PERMISSIONS-SCHEMA-DEFINED]
 * 1. Define RoutePermission type ('public' | 'authenticated' | 'admin')
 * 2. Add precision constraints and aiDebugHints.
 */

// Define ArkType schema for RoutePermission level
export const RoutePermissionLevelSchema = type("'public' | 'authenticated' | 'admin'");

export type RoutePermissionLevel = typeof RoutePermissionLevelSchema.infer;

export const aiDebugHints: Record<RoutePermissionLevel, string> = {
  public: "Public level access. Suitable for photo wall, shared views. Low risk.",
  authenticated: "Authenticated staff mode. Allows basic changes, tagging, translations. Medium risk.",
  admin: "Administrator mode with full access to critical configurations, settings, storage. High risk."
};

// RouteAccessContract schema definition
export const RouteAccessContractSchema = type({
  "permission": "'public' | 'authenticated' | 'admin'",
  "fallbackRedirect": "string"
});

export type RouteAccessContract = typeof RouteAccessContractSchema.infer;

export interface UserContext {
  user: { id: string; email: string } | null;
  role: 'admin' | 'staff' | 'guest';
}

/**
 * Validates access based on RouteAccessContract and context
 */
export function validateAccess(contract: RouteAccessContract, context: UserContext) {
  // Validate schema first for robust type-safety
  const check = RouteAccessContractSchema(contract);
  if (check instanceof type.errors) {
    throw ErrorFactory.wrap(new Error(`RouteAccessContract schema violation: ${check.summary}`), 'validateAccess');
  }

  const { user, role } = context;
  const permission = contract.permission;
  const fallback = contract.fallbackRedirect;

  let allowed = true;
  if (permission === 'admin') {
    allowed = role === 'admin';
  } else if (permission === 'authenticated') {
    allowed = !!user || role === 'admin';
  }

  if (!allowed) {
    const hint = aiDebugHints[permission] || "Insufficient permissions";
    const errorMessage = `Access Denied: Required level is '${permission}'. ${hint}`;

    // Perform redirect without throwing or logging to ErrorBoundary for graceful degradation
    throw redirect({
      to: fallback,
      search: {
        authError: "admin_required" as const
      }
    });
  }
}
