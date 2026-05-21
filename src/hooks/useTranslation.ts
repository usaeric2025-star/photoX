import { useStore } from '@/store'

// 导入语言包
import zh from '@/locales/zh.json'
import en from '@/locales/en.json'
import ms from '@/locales/ms.json'

const translations = { zh, en, ms }

export const useTranslation = () => {
  const language = useStore((s) => s.language) || 'zh'
  // @ts-ignore
  const t = translations[language] || translations['zh']
  return { t, language }
}
