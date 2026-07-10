import { hc } from 'hono/client';
import type { AppType } from '#api/_app.js';
import { storage } from '#lib/storage.js';
import { tokenSignal } from '#src/store/authStore.js';
import { ErrorFactory } from '#src/lib/error/index.js';

// Get base URL for the API
const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
};

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
    const token = tokenSignal.peek();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  },
  fetch: async (input, init) => {
    const response = await fetch(input, init);
    
    if (!response.ok) {
      // Global error interceptor
      let errorData = null;
      try {
        // Clone the response so it can still be consumed by the caller if needed
        errorData = await response.clone().json();
      } catch (e) {
        // Not JSON
      }
      
      const err = ErrorFactory.fromApiResponse(errorData, `${response.status} ${response.statusText}`);
      // Automatically pop up toast for all 4xx/5xx errors
      ErrorFactory.handle(err, { context: 'API Request' });
    }
    
    return response;
  }
});

export const api = client.api;
