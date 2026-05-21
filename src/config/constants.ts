// 静态常量，不依赖环境
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  GROUP_PAGE_SIZE: 100,
  MAX_PAGE_SIZE: 200,
}

export const UI = {
  DEBOUNCE_DELAY_MS: 300,
  LONG_PRESS_DELAY_MS: 500,
  TOAST_DURATION_MS: 3000,
}

export const ROUTES = {
  HOME: '/',
  ADMIN: '/admin',
  LOGIN: '/login',
  GROUP: (id: string) => `/g/${id}`,
  ADMIN_GROUP: (id: string) => `/admin/group/${id}`,
}

export const DEFAULT_MODEL = 'gemini-1.5-flash';
