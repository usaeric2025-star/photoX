import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { storageKeys } from '@/lib/queryKeys';
import { StorageAuditResSchema } from '@/shared/apiContractSchema';
import { type } from 'arktype';

export function R2AuditReport() {
  const { data, isLoading, error } = useQuery({
    queryKey: storageKeys.audit(),
    queryFn: async () => {
      const resp = await fetch('/api/storage/audit');
      const json = await resp.json();
      const check = StorageAuditResSchema(json);
      if (check instanceof type.errors) throw new Error('Invalid response');
      return check;
    }
  });

  if (isLoading) return <div>Loading audit...</div>;
  if (error || !data?.data) return <div>Failed to load audit report</div>;

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-lg font-bold mb-4">R2 Storage Audit</h2>
      <div className="mb-4">
        <p>Healthy: {data.data.healthy}</p>
        <p>Missing: {data.data.missing}</p>
        <p>Orphans: {data.data.orphans}</p>
      </div>
      {/* Chart and Tables should be added here */}
    </div>
  );
};
