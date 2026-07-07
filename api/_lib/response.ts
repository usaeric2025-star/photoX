import { type Context } from 'hono';
import { getTraceId } from './error/traceId.js';
import { AppError } from '../../shared/AppError.js';
import { errorFactory } from './error/factory.js';
import { logger } from './logger.js';

/**
 * 統一錯誤回應格式
 * 確保與前端 ErrorFactory 解析邏輯一致
 */
export const errorResponse = (c: Context, error: unknown, status: number = 500) => {
  const traceId = getTraceId(c);
  const path = c.req.path;
  const method = c.req.method;

  let message = '伺服器錯誤';
  let statusCode = status;
  let errorCode: string | number = status;

  const appError = error instanceof AppError 
    ? error 
    : errorFactory.wrap(error, `api.${path}`, 'HANDLER_ERROR');
  appError.traceId = traceId;

  message = appError.message;
  statusCode = appError.statusCode || status;
  errorCode = appError.code;

  // --- Logging ---
  logger.error('api.error', { traceId, path, method, code: errorCode, message, stack: appError.stack });

  const logToDb = async () => {
    try {
      const { db, systemLogs } = await import('./db/index.js');
      await db.insert(systemLogs).values({
        message: `[API ERROR] ${message}`,
        level: 'error',
        operation: `api.${path}`,
        metadata: { traceId, method, code: errorCode, stack: appError.stack, timestamp: new Date().toISOString() },
        createdAt: new Date()
      });
    } catch (logErr) {
      console.error('[log-error] Fatal exception in logger:', logErr);
    }
  };

  let hasWaitUntil = false;
  try {
    if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
      hasWaitUntil = true;
    }
  } catch (e) {
    // Accessing c.executionCtx throws if there is no execution context
  }

  if (hasWaitUntil) {
    c.executionCtx.waitUntil(logToDb());
  } else {
    logToDb().catch(e => console.error('Failed to log to DB:', e));
  }
  
  // Safe message formatting (prevents leaking sensitive info)
  const safeData = errorFactory.fail(appError);

  return c.json({
    success: false,
    error: {
      message: safeData.error.message,
      code: errorCode,
      traceId,
    },
  }, statusCode as import('hono/utils/http-status').ContentfulStatusCode);
};

/**
 * 統一成功回應格式
 */
export const successResponse = <T>(c: Context, data: T, extra: Record<string, any> = {}, status: number = 200) => {
  const response = {
    success: true as const,
    data,
    ...extra
  };
  return c.json(response, status as import('hono/utils/http-status').ContentfulStatusCode);
};
