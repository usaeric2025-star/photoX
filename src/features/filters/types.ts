type SortOrder = 'newest' | 'oldest';
type ColumnCount = 2 | 3 | 5;

export interface FilterState {
  search: string;
  categoryId: number | null;
  tagIds: string[];
  sort: SortOrder;
}
