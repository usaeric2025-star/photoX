import React, { createContext, useContext, useMemo } from 'react';

export type FormContextType = {
  fieldErrors: Record<string, string>;
  clearFieldError: (name: string) => void;
};

export const FormContext = createContext<FormContextType | null>(null);

export function FormProvider({ 
  fieldErrors, 
  clearFieldError, 
  children 
}: FormContextType & { children: React.ReactNode }) {
  const value = useMemo(() => ({ fieldErrors, clearFieldError }), [fieldErrors, clearFieldError]);
  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
}

export function useFormField(name: string) {
  const ctx = useContext(FormContext);
  
  if (!ctx) {
    // Graceful fallback to standalone mode if not wrapped in FormProvider
    return {
      error: undefined,
      onChange: undefined,
    };
  }

  return {
    error: ctx.fieldErrors[name],
    onChange: () => ctx.clearFieldError(name),
  };
}
