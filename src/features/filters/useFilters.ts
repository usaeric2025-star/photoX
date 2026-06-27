import { useQueryState, parseAsString } from 'nuqs';

export function useFilters() {
  const [category, setCategory] = useQueryState(
    'category',
    parseAsString.withDefault('')
  );

  const [tags, setTags] = useQueryState(
    'tags',
    parseAsString.withDefault('')
  );

  const resetFilters = () => {
    setCategory(null);
    setTags(null);
  };

  return {
    category,
    tags,
    setCategory,
    setTags,
    resetFilters,
    hasFilters: !!category || !!tags,
  };
}
