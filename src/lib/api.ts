import { hc } from 'hono/client';
import type { AppType } from '../../server';
import { clientEnv } from '../shared/envSchema';

/**
 * [V2.9-RPC-CONTRACT] Type-safe RPC Client
 */
export const client = hc<AppType>(
  clientEnv.DEV ? `http://localhost:3000` : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
  {
    async fetch(input, init) {
      const resp = await fetch(input, init);
      
      // If it's not JSON, it might be the server crashing or returning HTML
      const contentType = resp.headers.get("Content-Type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await resp.text();
        throw {
          success: false,
          error: {
            message: `Server returned non-JSON response: ${text.substring(0, 100)}`,
            code: 'INTERNAL_SERVER_ERROR'
          }
        };
      }
      return resp;
    }
  }
);

export const api = (client as any).api;
