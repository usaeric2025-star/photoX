import React from 'react';
import { AdminViewContent } from './AdminViewContent';
import { AdminProvider } from '@/contexts/AdminContext';

export const AdminView: React.FC = () => {
  return (
    <AdminProvider>
      <AdminViewContent />
    </AdminProvider>
  );
};

export default AdminView;
