import React from 'react';
import { useAdminDataPrep } from './useAdminDataPrep';
import { AdminViewContent } from './AdminViewContent';

export const AdminView: React.FC = () => {
  const data = useAdminDataPrep();
  
  return (
    <AdminViewContent 
      {...data} 
      hasNextPage={data.infinitePhotosQuery.hasNextPage}
      isFetchingNextPage={data.infinitePhotosQuery.isFetchingNextPage}
    />
  );
};

export default AdminView;
