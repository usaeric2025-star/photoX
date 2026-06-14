import { AppError, ErrorSeverity, isAppError } from './ErrorFactory'

// WeakSet for tracking reported errors to avoid duplicates
const reportedErrors = new WeakSet<Error>()

function shouldLogToBackend(error: Error): boolean {
  return !error.message.includes('AbortError')
}

function handleReportFailure(error: unknown): void {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    console.debug('[ErrorReporter] 日誌上報網路失敗，已忽略')
    return
  }
  console.error('[ErrorReporter] 日誌上報 API 失敗:', error)
}

export async function reportError(error: Error | AppError): Promise<void> {
  if (reportedErrors.has(error)) return
  reportedErrors.add(error)

  const isAppErrorObj = isAppError(error)

  if (isAppErrorObj && error.severity === ErrorSeverity.INFO) {
    console.debug('[ErrorReporter] INFO level, skip remote report')
    return
  }

  // 1. GlitchTip / Sentry
  if (typeof window !== 'undefined' && 'Sentry' in window) {
    // Sentry capture exception is handled elsewhere or can be used here
  }

  // 2. Backend logging via system_logs
  if (isAppErrorObj || shouldLogToBackend(error)) {
    const payload = isAppErrorObj
      ? error.toJSON()
      : {
          name: error.name,
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        }

    try {
      await fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (err) {
      handleReportFailure(err)
    }
  }
}

export async function reportErrors(errors: Error[]): Promise<void> {
  await Promise.all(errors.map(reportError))
}
