import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface MultilingualInputProps {
  name: string
  label?: string
  required?: boolean
}

export const MultilingualInput = ({ name, label, required }: MultilingualInputProps) => {
  const { register, formState: { errors } } = useFormContext();
  
  // Helper to get nested error
  const getError = (path: string) => {
    const error = errors[name as any] as any;
    if (!error) return undefined;
    const parts = path.split('.');
    let current = error;
    for (const part of parts) {
      if (!current) return undefined;
      current = current[part];
    }
    return current;
  };
  
  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {['zh', 'en', 'ms'].map((lang) => (
          <div key={lang}>
            <span className="text-xs text-slate-500 uppercase">{lang === 'zh' ? '中文' : lang === 'en' ? '英文' : '馬來文'}</span>
            <input 
              {...register(`${name}.${lang}`, { required: required && lang === 'zh' })} 
              className={cn(
                "w-full input border rounded-md p-2",
                getError(lang) ? "border-red-500" : "border-slate-300"
              )} 
            />
            {getError(lang) && <p className="text-red-500 text-xs mt-1">{getError(lang)?.message}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
