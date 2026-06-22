export const STORAGE = {
  BUCKET: (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_R2_BUCKET_NAME : (typeof process !== 'undefined' && process.env ? process.env.R2_BUCKET_NAME : '')) || '',
  PATHS: {
    ORIGINAL: 'photox/original',
    PUBLIC: 'photox/public',
    THUMB: 'photox/thumb',
  },
  PUBLIC_URL: (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_R2_PUBLIC_URL_PREFIX : (typeof process !== 'undefined' && process.env ? process.env.R2_PUBLIC_URL_PREFIX : '')) || '',
  ENDPOINT: (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_R2_ENDPOINT : (typeof process !== 'undefined' && process.env ? process.env.R2_ENDPOINT : '')) || '',
};
