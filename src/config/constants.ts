// 静态常量，不依赖环境
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 24,
  GROUP_PAGE_SIZE: 24,
  MAX_PAGE_SIZE: 100,
}

export const UI = {
  DEBOUNCE_DELAY_MS: 300,
  LONG_PRESS_DELAY_MS: 500,
  TOAST_DURATION_MS: 3000,
  MIN_LOADING_TIME_MS: 350,
}

export const ROUTES = {
  HOME: '/',
  ADMIN: '/admin',
  LOGIN: '/login',
  GROUP: (id: string) => `/g/${id}`,
  ADMIN_GROUP: (id: string) => `/admin/group/${id}`,
}

export const DEFAULT_MODEL = 'Gemini 2.5 Flash Lite Preview 09-2025';
