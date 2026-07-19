import { hc } from 'hono/client';
import type { AppType } from '#api/_app.js';
import { storage } from '#lib/storage.js';
import { tokenAtom } from '#src/store/index.js';
import { ErrorFactory } from '#src/lib/error/index.js';
import { getDefaultStore } from 'jotai';

// Get base URL for the API
const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
};

const store = getDefaultStore();

// Create the type-safe client with custom fetch for auth headers and global error handling
const client = hc<AppType>(getBaseUrl(), {
  headers: () => {
    // 1. Check for mock passcode (Staff mode)
    const raw = storage.getItem('ais_mock_auth_passcode');
    if (raw) {
      try {
        const passcode = JSON.parse(raw);
        if (passcode) {
          return { Authorization: `Passcode ${passcode}` };
        }
      } catch (e) {
        // Fall through
      }
    }
    
    // 2. Check for Supabase session token (Admin mode)
    const token = store.get(tokenAtom);
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }

    return {};
  },
  fetch: async (input, init) => {
    const response = await fetch(input, init);
    
    // We removed the global ErrorFactory.handle() here to prevent duplicate error toasts,
    // since ErrorFactory.unwrap() and query/mutation hooks already display the errors with better context.

    return response;
  }
});

export const api = client.api;
