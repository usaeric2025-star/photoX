// src/lib/env.ts

export const getEnv = (key: string): string => {
  // In browser, Vite injects VITE_ variables into import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] !== undefined) {
    return import.meta.env[key];
  }
  // In server, we use process.env
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
    return process.env[key]!;
  }
  return '';
};
