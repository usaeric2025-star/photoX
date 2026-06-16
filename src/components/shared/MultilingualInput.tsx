import { useFormContext, UseFormReturn, FieldValues, FieldError, Merge, FieldErrors } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface MultilingualInputProps {
  name: string
  label?: string
  required?: boolean
  form?: UseFormReturn<FieldValues>
}

export const MultilingualInput = ({ name, label, required, form: propForm }: MultilingualInputProps) => {
  const context = useFormContext();
  const form = propForm || context;
  
  if (!form) return null;

  const { register, formState: { errors } } = form;
  
  // Helper to get nested error
  const getError = (path: string): FieldError | undefined => {
    const error = (errors as FieldErrors<FieldValues>)[name] as Merge<FieldError, Record<string, FieldError>> | undefined;
    if (!error) return undefined;
    
    // Access nested error directly via path: lang (e.g., 'zh', 'en', 'ms')
    const langError = (error as unknown as Record<string, FieldError>)[path];
    return langError;
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
