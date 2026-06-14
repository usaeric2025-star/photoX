import { logError } from '@/lib/error/errorReporter';

export async function logErrorToSupabase(error: Error, errorInfo: { componentStack?: string } | null, extras: Record<string, unknown> = {}) {
  await logError(error, {
    action: 'React Boundary Error',
    component: errorInfo?.componentStack?.slice(0, 200) || 'Unknown',
    kind: 'UNKNOWN',
    metadata: {
      ...extras,
      componentStack: errorInfo?.componentStack
    }
  });
}

