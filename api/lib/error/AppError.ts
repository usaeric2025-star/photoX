export class AppError extends Error {
  public readonly code: string
  public readonly context: string
  public traceId?: string
  public readonly timestamp: number

  constructor(options: { code: string; message: string; context: string }) {
    super(options.message)
    this.name = 'AppError'
    this.code = options.code
    this.context = options.context
    this.timestamp = Date.now()
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      context: this.context,
      traceId: this.traceId,
      timestamp: this.timestamp,
    }
  }
}

export const errorFactory = {
  create: (options: { code: string; message: string; context: string }): AppError => {
    return new AppError(options)
  },

  wrap: (error: unknown, context: string, code?: string): AppError => {
    if (error instanceof AppError) return error
    const message = error instanceof Error ? error.message : String(error)
    return new AppError({ code: code || 'UNKNOWN_ERROR', message, context })
  },

  success: <T>(data: T): { ok: true; data: T } => ({ ok: true, data }),

  fail: <T = never>(error: AppError): {
    ok: false
    error: { code: string; message: string; timestamp: number }
  } => ({
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp,
    },
  }),
}
