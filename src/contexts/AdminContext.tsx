import React, { createContext, useContext, useMemo } from 'react';
import { useAdminDataPrep } from '@/pages/AdminView/useAdminDataPrep';

type AdminContextType = ReturnType<typeof useAdminDataPrep>;

const AdminContext = createContext<AdminContextType | null>(null);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const logic = useAdminDataPrep();
  return (
    <AdminContext.Provider value={logic}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
