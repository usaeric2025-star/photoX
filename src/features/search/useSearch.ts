import { useQueryState, parseAsString, debounce } from 'nuqs';

export function useSearch() {
  const [search, setSearch] = useQueryState(
    'search',
    parseAsString.withDefault('')
  );

  const handleSearch = (value: string) => {
    setSearch(value || null, {
      limitUrlUpdates: debounce(500),
    });
  };

  return {
    search,
    setSearch: handleSearch,
    clearSearch: () => setSearch(null),
  };
}
