import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ErrorAlert } from '../components/ErrorAlert';

let addLogGlobal: (msg: string, ctx?: string, t?: 'error'|'warning'|'info') => void = () => {};
export const addSystemLog = (message: string, context?: string, type?: 'error'|'warning'|'info') => addLogGlobal(message, context, type);

let showErrorGlobal: (msg: string) => void = () => console.error("Error Alert not initialized");
export const showSystemError = (message: string) => showErrorGlobal(message);

interface ErrorLog {
  message: string;
  timestamp: number;
  context?: string;
  type?: 'error' | 'warning' | 'info';
}

interface ErrorContextType {
  showError: (message: string, context?: string) => void;
  addLog: (message: string, context?: string, type?: 'error' | 'warning' | 'info') => void;
  errors: ErrorLog[];
  clearErrors: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider = ({ children }: { children: ReactNode }) => {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    showErrorGlobal = (message: string) => {
      showError(message);
    };
    addLogGlobal = (message: string, context?: string, type?: 'error'|'warning'|'info') => {
      addLog(message, context, type || 'error');
    };
  }, []);

  const addLog = (message: string, context?: string, type: 'error' | 'warning' | 'info' = 'error') => {
    setErrors(prev => [{ message, timestamp: Date.now(), context, type }, ...prev].slice(0, 100)); // Keep last 100
  };

  const showError = (message: string, context?: string) => {
    addLog(message, context, 'error');
    setLastError(message);
    setTimeout(() => setLastError(null), 5000);
  };
  
  const clearErrors = () => setErrors([]);

  return (
    <ErrorContext.Provider value={{ showError, addLog, errors, clearErrors }}>
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
