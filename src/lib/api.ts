import { hc } from 'hono/client';
import type { AppType } from '#api/_app.js';
import { storage, STORAGE_KEYS } from '#lib/storage.js';
import { tokenAtom } from '#src/store/index.js';
import { getDefaultStore } from 'jotai';
import { supabase } from '#lib/supabase.js';

// Get base URL for the API
const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
};

const store = getDefaultStore();

const resolveAuthToken = (): string | null => {
  let token = store.get(tokenAtom);
  if (token) return token;

  // 1. Check for staff session in local storage
  const savedStaff = storage.get(STORAGE_KEYS.STAFF_USER, null);
  if (savedStaff) {
    token = 'staff-token';
    store.set(tokenAtom, token);
    return token;
  }

  return null;
};

// Create the type-safe client with custom fetch for auth headers and global error handling
const client = hc<AppType>(getBaseUrl(), {
  headers: () => {
    const headers: Record<string, string> = {};
    const token = resolveAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  },
  fetch: async (input, init) => {
    const options = init || {};
    let token = resolveAuthToken();

    if (!token) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          token = data.session.access_token;
          store.set(tokenAtom, token);
        }
      } catch {
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

    const response = await fetch(input, options);
    return response;
  }
});

export const api = client.api;
