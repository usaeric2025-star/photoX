import { useQueryState, parseAsInteger } from 'nuqs';

export function usePagination() {
  const [page, setPage] = useQueryState(
    'page',
    parseAsInteger.withDefault(1)
  );

  const [limit, setLimit] = useQueryState(
    'limit',
    parseAsInteger.withDefault(20)
  );

  const nextPage = () => setPage(page + 1);
  const prevPage = () => setPage(Math.max(1, page - 1));
  const resetPage = () => setPage(1);

  return {
    page,
    limit,
    setPage,
    setLimit,
    nextPage,
    prevPage,
    resetPage,
  };
}
