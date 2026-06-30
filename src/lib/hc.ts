import { hc } from 'hono/client';
import type { apiApp } from '@api/_app';

/**
 * Type-safe Hono RPC client for PhotoX
 * We use the internal apiApp type directly to bypass the top-level wrapper mapping issues
 */
const client = hc<typeof apiApp>(typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:3000/api');

export const hcClient = client;
