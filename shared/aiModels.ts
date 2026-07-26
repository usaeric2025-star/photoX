export const DEFAULT_AI_MODELS = {
  openrouter: 'google/gemini-2.5-flash-lite',
  agnes: 'gemini-2.0-flash-exp',
  gemini: 'gemini-2.0-flash',
} as const;

export type AIProviderName = keyof typeof DEFAULT_AI_MODELS;
