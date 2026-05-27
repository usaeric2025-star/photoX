import { hc } from 'hono/client';
import type { AppType } from '../../server';
import { clientEnv } from '../shared/envSchema';

/**
 * [V2.9-RPC-CONTRACT] Type-safe RPC Client
 */
export const client = hc<AppType>(
  clientEnv.DEV ? `http://localhost:3000` : window.location.origin
);

export const api = (client as any).api;
