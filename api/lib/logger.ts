export const logger = {
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      ...meta,
    }))
  },

  info: (message: string, meta?: Record<string, unknown>) => {
    console.info(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      ...meta,
    }))
  },

  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(JSON.stringify({
      level: 'warn',
      timestamp: new Date().toISOString(),
      message,
      ...meta,
    }))
  },

  debug: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(JSON.stringify({
        level: 'debug',
        timestamp: new Date().toISOString(),
        message,
        ...meta,
      }))
    }
  },
}
