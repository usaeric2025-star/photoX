/**
 * Resilient Fetch with automatic retry mechanism.
 * Useful for flaky network connections (e.g., R2 operations, external API calls).
 */
export async function resilientFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries: number = 3,
  backoff: number = 1000
): Promise<Response> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(input, init);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return response;
    } catch (err) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, backoff * (i + 1)));
      }
    }
  }
  throw lastError;
}
