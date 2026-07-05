import { getEnv } from '#lib/env.js';

export const STORAGE = {
  BUCKET: getEnv('VITE_R2_BUCKET_NAME'),
  PATHS: {
    ORIGINAL: 'photox/original',
    PUBLIC: 'photox/public',
    THUMB: 'photox/thumb',
  },
  PUBLIC_URL: getEnv('VITE_R2_PUBLIC_URL_PREFIX'),
  ENDPOINT: getEnv('VITE_R2_ENDPOINT'),
};
