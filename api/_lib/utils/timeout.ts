import { logger } from '../logger.js';

export function withTimeout<T>(promiseOrThenable: Promise<T> | PromiseLike<T>, ms: number, labelOrError = 'Operation timed out'): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    const errorMsg = labelOrError.includes('timed out') || labelOrError.includes('timeout') || labelOrError.includes('超時') || labelOrError.includes('逾時')
      ? labelOrError
      : `Operation [${labelOrError}] timed out after ${ms}ms`;
    timeoutId = setTimeout(() => reject(new Error(errorMsg)), ms);
  });

  const actualPromise = Promise.resolve(promiseOrThenable);

  // Prevent unhandled rejections if the original promise fails after the timeout has already won
  actualPromise.catch(() => {});

  return Promise.race([actualPromise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

const DEFAULT_PING_TIMEOUT_MS = 30000; // 30 seconds to allow for 25s connect_timeout

/**
 * Executes a SELECT 1 query with retry logic to withstand transient connection timeouts
 */
export async function pingDbWithRetry(db: any, sql: any, retries = 3, delayMs = 1500, timeoutMs = DEFAULT_PING_TIMEOUT_MS): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const dbPromise = db.execute(sql`SELECT 1`);
      await withTimeout(dbPromise, timeoutMs, 'Health DB Ping');
      return;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.info(`ℹ️ [DB Connection Retry] Attempt ${i + 1}/${retries} to ping database failed, retrying: ${errMsg} | Cause: ${(err as any).cause ? String((err as any).cause) : ""} | Code: ${(err as any).code || ""}`);
      if (i < retries - 1) {
        // Linear/exponential backoff to allow pooler/database to recover
        const actualDelay = delayMs * (i + 1);
        await new Promise((resolve) => setTimeout(resolve, actualDelay));
      } else {
        throw err;
      }
    }
  }
}

// Global timeout configs to avoid magic numbers across the app (Locked 2026-07)
export const TIMEOUTS = {
  DB_QUERY: 15000, // 15 seconds for standard DB queries (strictly matches statement_timeout)
  AI_REQUEST: 60000, // 60 seconds for AI inference (Gemini Flash can take longer)
  PUBLIC_META: 10000, // 10 seconds for fast-loading public settings/auth
  DB_PING: DEFAULT_PING_TIMEOUT_MS,
};

