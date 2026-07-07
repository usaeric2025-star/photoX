import { hc } from 'hono/client';
import type { AppType } from '#api/_app.js';

// Get base URL for the API
const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
};

// Create the type-safe client
const client = hc<AppType>(getBaseUrl());
export const api = client.api;
