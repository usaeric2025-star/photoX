export const STORAGE = {
  BUCKET: (typeof process !== 'undefined' && process.env ? process.env.R2_BUCKET_NAME : '') || '',
  PATHS: {
    ORIGINAL: 'photox/original',
    PUBLIC: 'photox/public',
    THUMB: 'photox/thumb',
  },
  PUBLIC_URL: 'https://pub-ffc4b0692ab74fabb58cbccc5287d7b1.r2.dev',
  ENDPOINT: 'https://3e1f6d6a9c0f2526239f23a5809fc667.r2.cloudflarestorage.com',
};
