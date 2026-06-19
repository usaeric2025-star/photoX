import { useFormContext, UseFormReturn, FieldValues, FieldError, Merge, FieldErrors } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface MultilingualInputProps {
  name: string
  label?: string
  required?: boolean
  form?: UseFormReturn<FieldValues>
  type?: 'input' | 'textarea'
}

export const MultilingualInput = ({ name, label, required, form: propForm, type = 'input' }: MultilingualInputProps) => {
  const context = useFormContext();
  const form = propForm || context;
  
  if (!form) return null;

  const { register, formState: { errors } } = form;
  
  const getError = (path: string): FieldError | undefined => {
    const error = (errors as FieldErrors<FieldValues>)[name] as Merge<FieldError, Record<string, FieldError>> | undefined;
    if (!error) return undefined;
    const langError = (error as unknown as Record<string, FieldError>)[path];
    return langError;
  };
  
  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-black text-slate-400 uppercase tracking-wider">{label}</label>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {['zh', 'en', 'ms'].map((lang) => (
          <div key={lang} className="space-y-1">
            <div className="flex items-center justify-between px-1">
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                 {lang.toUpperCase()}
               </span>
            </div>
            {type === 'textarea' ? (
              <textarea 
                {...register(`${name}.${lang}`, { required: required && lang === 'zh' })} 
                className={cn(
                  "w-full bg-white border rounded-xl p-3 text-sm font-medium outline-none h-32 resize-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-100",
                  getError(lang) ? "border-red-500" : "border-slate-200"
                )} 
              />
            ) : (
              <input 
                {...register(`${name}.${lang}`, { 
                  required: required && lang === 'zh',
                  setValueAs: (v) => typeof v === 'string' ? v.toUpperCase() : v
                })} 
                className={cn(
                  "w-full bg-white border rounded-xl px-3 py-2 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-100",
                  getError(lang) ? "border-red-500" : "border-slate-200"
                )} 
              />
            )}
            {getError(lang) && <p className="text-red-500 text-[10px] mt-1 font-bold">{getError(lang)?.message}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
