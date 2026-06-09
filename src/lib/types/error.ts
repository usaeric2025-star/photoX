export interface StandardError {
  code: string
  message: string
  context: string
  traceId?: string
  timestamp: number
  stack?: string
  details?: unknown
}

export interface AppResult<T = unknown> {
  ok: boolean
  data?: T
  error?: {
    code: string
    message: string
    timestamp: number
  }
}
