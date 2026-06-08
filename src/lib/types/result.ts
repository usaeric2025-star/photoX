export type AppResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };
