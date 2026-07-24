import { hc } from 'hono/client';
import type { AppType } from '#api/_app.js';
import { storage } from '#lib/storage.js';
import { tokenAtom } from '#src/store/index.js';
import { ErrorFactory } from '#src/lib/error/index.js';
import { getDefaultStore } from 'jotai';
import { supabase } from '#lib/supabase.js';

// Get base URL for the API
const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
};

const store = getDefaultStore();

// Create the type-safe client with custom fetch for auth headers and global error handling
const client = hc<AppType>(getBaseUrl(), {
  headers: () => {
    const headers: Record<string, string> = {};

    // Check for Supabase session token (Admin mode)
    const token = store.get(tokenAtom);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      return headers;
    }

    return headers;
  },
  fetch: async (input, init) => {
    const options = init || {};
    let token = store.get(tokenAtom);

    // Rule 4: Centralized Frontend Timeout
    const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
    let timeoutMs = 30000; // Default 30s
    if (url.includes('/api/ai')) timeoutMs = 60000;
    else if (url.includes('/api/upload') || url.includes('/api/storage') || url.includes('batch')) timeoutMs = 120000;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    if (!token) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          token = data.session.access_token;
        }
      } catch (err) {
        // ignore fallback errors
      }
    }

    if (token) {
      const headers = new Headers(options.headers);
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      options.headers = headers;
    }

    try {
      const response = await fetch(input, {
        ...options,
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(id);
    }
  }
});

export const api = client.api;
