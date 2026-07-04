const isBrowser = typeof window !== 'undefined';

const getEnv = (metaKey: string, processKey: string) => {
  if (isBrowser) {
    return (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[metaKey]) || '';
  }
  return (typeof globalThis !== 'undefined' && (globalThis as any)['process']?.['env']?.[processKey]) || '';
};

export const STORAGE = {
  BUCKET: getEnv('VITE_R2_BUCKET_NAME', 'R2_BUCKET_NAME'),
  PATHS: {
    ORIGINAL: 'photox/original',
    PUBLIC: 'photox/public',
    THUMB: 'photox/thumb',
  },
  PUBLIC_URL: getEnv('VITE_R2_PUBLIC_URL_PREFIX', 'R2_PUBLIC_URL_PREFIX'),
  ENDPOINT: getEnv('VITE_R2_ENDPOINT', 'R2_ENDPOINT'),
};
