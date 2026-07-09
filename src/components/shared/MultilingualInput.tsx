import { Field } from "@tanstack/react-form";
import { cn } from '#lib/utils.js';
// ... rest of imports
interface MultilingualInputProps {
  form: unknown;
  name: string
  label?: string
  required?: boolean
  type?: 'input' | 'textarea'
}

export const MultilingualInput = ({ form, name, label, required, type = 'input' }: MultilingualInputProps) => {
  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-black text-slate-400 uppercase tracking-wider">{label}</label>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {['zh', 'en', 'ms'].map((lang) => {
          return (
            <Field key={lang} form={form as never} name={`${name}.${lang}` as never}>
              {(field) => (
                <div className="relative group">
                  <div className="absolute top-2.5 left-2.5 hidden group-focus-within:flex items-center justify-center pointer-events-none px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                    <span className="text-[8px] font-black text-slate-500 uppercase leading-none">
                      {lang}
                    </span>
                  </div>
                  {type === 'textarea' ? (
                    <textarea 
                      value={(field.state.value as string) || ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={lang.toUpperCase()}
                      className={cn(
                        "w-full bg-white border rounded-xl p-4 text-sm font-medium outline-none h-40 resize-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50",
                        field.state.meta.errors.length ? "border-red-500" : "border-slate-200"
                      )} 
                    />
                  ) : (
                    <input 
                      value={(field.state.value as string) || ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={lang.toUpperCase()}
                      className={cn(
                        "w-full bg-white border h-11 px-4 rounded-xl text-sm font-bold outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50",
                        field.state.meta.errors.length ? "border-red-500" : "border-slate-200"
                      )} 
                    />
                  )}
                  {field.state.meta.errors.length > 0 && <p className="text-red-500 text-[10px] mt-1.5 px-3 font-bold">{String(field.state.meta.errors[0])}</p>}
                </div>
              )}
            </Field>
          );
        })}
      </div>
    </div>
  );
};
