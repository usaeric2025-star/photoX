import { hc } from 'hono/client';
import type { AppType } from '#api/_app.js';

// Minimal client to avoid circular dependencies in logging/telemetry
const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
};

export const rawApi = hc<AppType>(getBaseUrl());
