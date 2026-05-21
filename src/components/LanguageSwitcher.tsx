import { useStore } from '@/store'

const languages = {
  zh: '中文',
  en: 'English',
  ms: 'Bahasa Melayu'
}

export const LanguageSwitcher = () => {
  const { language, setLanguage } = useStore()

  return (
    <select 
      value={language} 
      onChange={(e) => setLanguage(e.target.value as any)}
      className="bg-slate-100 p-2 rounded text-sm"
    >
      {Object.entries(languages).map(([code, name]) => (
        <option key={code} value={code}>{name}</option>
      ))}
    </select>
  )
}
