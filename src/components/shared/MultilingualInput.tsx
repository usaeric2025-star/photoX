import { useField, useFormContext } from "el-form-react-hooks";
import { cn } from '@/lib/utils';
// ... rest of imports
interface MultilingualInputProps {
  name: string
  label?: string
  required?: boolean
  type?: 'input' | 'textarea'
}

export const MultilingualInput = ({ name, label, required, type = 'input' }: MultilingualInputProps) => {
  const { form } = useFormContext();
  
  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-black text-slate-400 uppercase tracking-wider">{label}</label>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {['zh', 'en', 'ms'].map((lang) => {
          const { value, error } = useField(`${name}.${lang}`);
          const langValue = (value as string) || '';
          
          return (
            <div key={lang} className="relative group">
              <div className="absolute top-2.5 left-2.5 hidden group-focus-within:flex items-center justify-center pointer-events-none px-1.5 py-0.5 rounded-md bg-slate-100/80 backdrop-blur-sm border border-slate-200">
                <span className="text-[8px] font-black text-slate-500 uppercase leading-none">
                  {lang}
                </span>
              </div>
              {type === 'textarea' ? (
                <textarea 
                  value={langValue}
                  onChange={(e) => form.setValue(`${name}.${lang}`, e.target.value)}
                  placeholder={lang.toUpperCase()}
                  className={cn(
                    "w-full bg-white border rounded-2xl p-4 text-sm font-medium outline-none h-40 resize-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50",
                    error ? "border-red-500" : "border-slate-200"
                  )} 
                />
              ) : (
                <input 
                  value={langValue}
                  onChange={(e) => form.setValue(`${name}.${lang}`, e.target.value)}
                  placeholder={lang.toUpperCase()}
                  className={cn(
                    "w-full bg-white border rounded-2xl px-4 py-3 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50",
                    error ? "border-red-500" : "border-slate-200"
                  )} 
                />
              )}
              {error && <p className="text-red-500 text-[10px] mt-1.5 px-3 font-bold">{String(error)}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
