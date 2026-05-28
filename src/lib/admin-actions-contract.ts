
/**
 * [ADMIN-ACTIONS-MATRIX-COMPLETE]
 * Defines the visibility matrix for all AdminView operations.
 */

export type ActionVisibility = 'visible' | 'disabled' | 'hidden';

export interface AdminActionMatrix {
  group_settings: Record<string, ActionVisibility>;
  bulk_settings: Record<string, ActionVisibility>;
  delete: Record<string, ActionVisibility>;
  move: Record<string, ActionVisibility>;
  hide: Record<string, ActionVisibility>;
  ai_analyze: Record<string, ActionVisibility>;
  pin: Record<string, ActionVisibility>;
  export: Record<string, ActionVisibility>;
}

// Simplified matrix representation for demonstration/contract purposes
export const ADMIN_ACTIONS_MATRIX: AdminActionMatrix = {
  group_settings: { 'grouped_mode_admin': 'visible', 'default_admin': 'hidden' },
  bulk_settings: { 'admin_mode_default': 'visible', 'grouped_mode_admin': 'visible' },
  delete: { 'admin': 'visible', 'viewer': 'hidden' },
  move: { 'admin': 'visible', 'viewer': 'hidden' },
  hide: { 'admin': 'visible', 'viewer': 'hidden' },
  ai_analyze: { 'admin': 'visible', 'editor': 'visible' },
  pin: { 'admin': 'visible', 'viewer': 'hidden' },
  export: { 'admin': 'visible', 'editor': 'visible', 'viewer': 'visible' },
};
