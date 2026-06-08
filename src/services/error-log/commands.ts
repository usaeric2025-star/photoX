import { api } from '@/lib/api';

export async function logErrorToSupabase(error: Error, errorInfo: { componentStack?: string } | null, extras: Record<string, unknown> = {}) {
  try {
    const payload = {
      error_message: error?.message || 'Unknown error',
      stack_trace: error?.stack || null,
      component_stack: errorInfo?.componentStack || null,
      url: typeof window !== 'undefined' ? window.location.href : '',
      metadata: {
        ...extras,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
      }
    };
    
    // We use standard fetch here to avoid circular imports or API client errors triggering more errors
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    await fetch(`${origin}/api/log-error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(e => console.error('Failed to send error to backend:', e));
    
  } catch (e) {
    console.error("Critical failure during error logging:", e);
  }
}

