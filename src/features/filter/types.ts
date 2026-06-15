export type SortOrder = 'newest' | 'oldest';
export type StatusFilter = 'all' | 'published' | 'draft';
export type ColumnCount = 2 | 3 | 5;

export interface FilterState {
  search: string;
  categoryId: string | null;
  tagIds: string[];
  sort: SortOrder;
  status: StatusFilter;
}
