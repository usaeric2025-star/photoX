import { Context } from 'hono'
import { v4 as uuidv4 } from 'uuid'

export const TRACE_HEADER = 'X-Trace-Id'

export const generateTraceId = (): string => uuidv4()

export const getTraceId = (c: Context): string => {
  const existing = c.req.header(TRACE_HEADER)
  if (existing) return existing
  const newId = generateTraceId()
  c.header(TRACE_HEADER, newId)
  return newId
}

export const setTraceId = (c: Context, traceId: string): void => {
  c.header(TRACE_HEADER, traceId)
}
