import React, { createContext, useContext, ReactNode } from 'react';

interface FormContextType {
    fieldErrors: Record<string, string>;
    clearFieldError: (name: string) => void;
}

const FormContext = createContext<FormContextType>({
    fieldErrors: {},
    clearFieldError: () => {},
});

export function FormProvider({ 
    children, 
    fieldErrors, 
    clearFieldError 
}: { 
    children: ReactNode; 
    fieldErrors: Record<string, string>;
    clearFieldError: (name: string) => void;
}) {
    return (
        <FormContext.Provider value={{ fieldErrors, clearFieldError }}>
            {children}
        </FormContext.Provider>
    );
}

export function useFormField(name: string) {
    const { fieldErrors, clearFieldError } = useContext(FormContext);
    
    return {
        error: fieldErrors[name],
        onChange: () => clearFieldError(name),
    };
}
