import { hc } from 'hono/client';
import type { AppType } from '../../api/_app';
import { supabase } from '#lib/supabase';

class ApiResponseError extends Error {
  public success = false;
  public status: number;
  public traceId: string;
  public details: string;
  public platformTip: string;
  public error: {
    message: string;
    code: string;
    details: string;
    traceId: string;
  };

  constructor(message: string, status: number, traceId: string, details: string, platformTip: string) {
    super(message);
    this.name = 'ApiResponseError';
    this.status = status;
    this.traceId = traceId;
    this.details = details;
    this.platformTip = platformTip;
    this.error = {
      message,
      code: 'INTERNAL_SERVER_ERROR',
      details,
      traceId
    };
  }
}

/**
 * [V2.9-RPC-CONTRACT] Type-safe RPC Client
 */
const client = hc<AppType>(
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  {
    async fetch(input: string | Request | URL, init?: RequestInit) {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const headers = new Headers(init?.headers);
      if (token) {
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      } else {
        const passcodeRaw = typeof window !== 'undefined' 
          ? (localStorage.getItem('photox_ais_mock_auth_passcode') || localStorage.getItem('ais_mock_auth_passcode')) 
          : null;
        if (passcodeRaw) {
          let passcode = '';
          try {
            passcode = JSON.parse(passcodeRaw);
          } catch {
            passcode = passcodeRaw;
          }
          if (passcode && !headers.has('Authorization')) {
            headers.set('Authorization', `Passcode ${passcode}`);
          }
        }
      }
      if (!headers.has('X-Trace-Id')) {
        // Generate a simple frontend trace ID (e.g., "frontend-8f2a...")
        headers.set('X-Trace-Id', `fe-${Math.random().toString(36).substring(2, 12)}`);
      }
      
      let resp: Response;
      let retries = 3;
      
      const executeRequest = async () => {
        let attempt = 0;
        while (true) {
          try {
            let finalSignal = init?.signal;
            if (typeof AbortSignal.timeout === 'function') {
              const timeoutSignal = AbortSignal.timeout(120000);
              if (finalSignal && typeof AbortSignal.any === 'function') {
                finalSignal = AbortSignal.any([finalSignal, timeoutSignal]);
              } else if (!finalSignal) {
                finalSignal = timeoutSignal;
              }
            } else if (!finalSignal) {
              const controller = new AbortController();
              setTimeout(() => controller.abort(), 120000);
              finalSignal = controller.signal;
            }
            
            const res = await fetch(input, { ...init, headers, signal: finalSignal });
            
            // Handle 429 Too Many Requests (AI Studio platform limits)
            if (res.status === 429 && attempt < 5) {
              attempt++;
              const backoff = Math.pow(2, attempt) * 500 + Math.random() * 500;
              await new Promise(resolve => setTimeout(resolve, backoff));
              continue;
            }
            
            return res;
          } catch (err) {
            if (retries > 0) {
              retries--;
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
            throw err;
          }
        }
      };

      resp = await executeRequest();
      
      // If it's not JSON, it might be the server crashing or returning HTML
      const contentType = resp.headers.get("Content-Type");
      if (!contentType || !contentType.includes("application/json")) {
        let text = await resp.text();
        const requestUrl = input instanceof Request ? input.url : String(input);
        const requestMethod = init?.method || (input instanceof Request ? input.method : 'GET');
        
        // Clean up common HTML clutter if present
        if (text.includes("<!DOCTYPE html>") || text.includes("<html") || text.includes("<body")) {
          const docTitle = text.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
          const bodyText = text.replace(/<style[\s\S]*?<\/style>/gi, '')
                               .replace(/<script[\s\S]*?<\/script>/gi, '')
                               .replace(/<[^>]*>/g, ' ')
                               .replace(/\s+/g, ' ')
                               .trim()
                               .substring(0, 300);
          text = docTitle ? `[${docTitle}] ${bodyText}` : bodyText;
        } else {
          // Flatten whitespace in plain text too
          text = text.replace(/\s+/g, ' ').trim();
        }

        // Add explicit platform diagnostic tips
        const reqTraceId = headers.get("X-Trace-Id");
        const resTraceId = resp.headers.get("X-Trace-Id");
        const vercelId = resp.headers.get("x-vercel-id");
        const traceId = resTraceId || vercelId || reqTraceId || "unknown";
        
        let platformTip = "";
        if (text.includes("FUNCTION_INVOCATION_FAILED")) {
          platformTip = " [诊断提示: Vercel Serverless 服务崩溃。通常是云端环境变量(R2/Supabase)配置缺失、交换错误，或服务启动代码出错]";
        } else if (resp.status === 413 || text.includes("Payload Too Large")) {
          platformTip = " [诊断提示: 传输的图片体积超出了 Serverless Platform 上行 body 限制 (通常为 4.5MB)]";
        } else if (resp.status === 502 || resp.status === 504) {
          platformTip = " [诊断提示: 网关超时/错误，后端子域名或中间件运行异常]";
        } else if (resp.status === 404) {
          platformTip = " [诊断提示: 路径不存在，请检查后台路由重写 vercel.json 映射配置和 API 挂载路径]";
        }

        const message = `服务器响应异常 [${requestMethod} ${requestUrl}] (HTTP ${resp.status}): ${text.substring(0, 400)}${platformTip}`;
        throw new ApiResponseError(message, resp.status, traceId, text, platformTip);
      }
      return resp;
    }
  }
);

// @ts-expect-error Hono type recursion limit can cause client to resolve as unknown in current file scope
export const api = client.api;
