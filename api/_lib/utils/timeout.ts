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

// Global timeout configs to avoid magic numbers across the app
export const TIMEOUTS = {
  DB_QUERY: 30000, // 30 seconds for standard DB queries
  AI_REQUEST: 40000, // 40 seconds for AI inference 
  PUBLIC_META: 30000, // 30 seconds for fast-loading public settings/auth (Critical for cold start)
};
