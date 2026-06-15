import React from 'react';
import { FilterBar } from '@/features/filter/components/FilterBar';

interface FiltersBarProps {
  filters?: any;
  showStatus?: boolean;
  showBatch?: boolean;
}

export const FiltersBar = ({ showStatus }: FiltersBarProps) => {
  return <FilterBar mode={showStatus ? 'admin' : 'public'} />;
};
