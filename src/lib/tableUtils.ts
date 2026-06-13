import { useReactTable, getCoreRowModel, getSortedRowModel, type ColumnDef, type SortingState } from '@tanstack/react-table';
import { useState } from 'react';

/**
 * Standard interface for TanStack table configuration.
 * Decouples actual rendering from logic.
 */
export function useTanStackTable<TData>({
  data,
  columns,
  initialSorting = [],
}: {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  initialSorting?: SortingState;
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  
  return { 
    table, 
    sorting, 
    setSorting 
  };
}

/**
 * Standard CSS classes for self-contained, no-z-index table layouts.
 */
export const tableClasses = {
  container: "w-full overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm font-sans",
  table: "w-full border-collapse text-left text-sm",
  thead: "bg-slate-50/50 border-b border-slate-100",
  th: "px-4 py-3.5 font-black text-slate-800 uppercase tracking-widest text-[10px] select-none",
  tr: "border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors",
  td: "px-4 py-4 text-slate-600 font-medium",
  cellAction: "flex justify-end gap-2",
};
