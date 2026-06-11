import { logger } from '@/lib/logger';
import { api } from '@/lib/api';

export async function logErrorToSupabase(error: Error, errorInfo: { componentStack?: string } | null, extras: Record<string, unknown> = {}) {
  // [2026-06-03] Frontend logs to /api/log-error are disabled to prevent performance/noise issues
  /*
  logger.error("UI Error caught:", error, errorInfo);
  */
}

