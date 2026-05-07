import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ErrorAlert } from '../components/ErrorAlert';

// Global trigger to use error alerts from outside components
let showErrorGlobal: (msg: string) => void = () => console.error("Error Alert not initialized");
export const showSystemError = (message: string) => showErrorGlobal(message);

interface ErrorContextType {
  showError: (message: string) => void;
  errors: { message: string, timestamp: number }[];
  clearErrors: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider = ({ children }: { children: ReactNode }) => {
  const [errors, setErrors] = useState<{ message: string, timestamp: number }[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    showErrorGlobal = (message: string) => {
      showError(message);
    };
  }, []);

  const showError = (message: string) => {
    setErrors(prev => [{ message, timestamp: Date.now() }, ...prev]);
    setLastError(message);
    setTimeout(() => setLastError(null), 5000);
  };
  
  const clearErrors = () => setErrors([]);

  return (
    <ErrorContext.Provider value={{ showError, errors, clearErrors }}>
      {children}
      {lastError && <ErrorAlert message={lastError} onClose={() => setLastError(null)} />}
    </ErrorContext.Provider>
  );
};

export const useError = () => {
    const context = useContext(ErrorContext);
    if (!context) throw new Error('useError must be used within ErrorProvider');
    return context;
};
