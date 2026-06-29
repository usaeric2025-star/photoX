export function withTimeout<T>(promiseOrThenable: Promise<T> | PromiseLike<T>, ms: number, errorMessage = 'Operation timed out'): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
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
  DB_QUERY: 10000, // 10 seconds for standard DB queries
  AI_REQUEST: 20000, // 20 seconds for AI inference 
};
