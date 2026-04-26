import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ErrorAlert } from '../components/ErrorAlert';

// Global trigger to use error alerts from outside components
let showErrorGlobal: (msg: string) => void = () => console.error("Error Alert not initialized");
export const showSystemError = (message: string) => showErrorGlobal(message);

interface ErrorContextType {
  showError: (message: string) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider = ({ children }: { children: ReactNode }) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    showErrorGlobal = (message: string) => {
      setError(message);
      setTimeout(() => setError(null), 5000);
    };
  }, []);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}
    </ErrorContext.Provider>
  );
};

export const useError = () => {
    const context = useContext(ErrorContext);
    if (!context) throw new Error('useError must be used within ErrorProvider');
    return context;
};
