import { useQueryState, createParser } from 'nuqs';

type SortOption = 'date' | 'name' | 'size';
type SortOrder = 'asc' | 'desc';

const sortOptionParser = createParser<SortOption>({
  parse: (value) => (['date', 'name', 'size'].includes(value) ? (value as SortOption) : null),
  serialize: (value) => value,
});

const sortOrderParser = createParser<SortOrder>({
  parse: (value) => (['asc', 'desc'].includes(value) ? (value as SortOrder) : null),
  serialize: (value) => value,
});

export function useSort() {
  const [sortBy, setSortBy] = useQueryState(
    'sort',
    sortOptionParser.withDefault('date')
  );

  const [sortOrder, setSortOrder] = useQueryState(
    'order',
    sortOrderParser.withDefault('desc')
  );

  const toggleOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return {
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
    toggleOrder,
  };
}
