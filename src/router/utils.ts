export const parseSearch = (searchStr: string): Record<string, unknown> => {
  const params = new URLSearchParams(searchStr);
  const result: Record<string, unknown> = {};
  params.forEach((value, key) => {
    if (!value) return;
    try {
      if (value === 'true' || value === 'false') {
        result[key] = value === 'true';
        return;
      }
      if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith('{') && value.endsWith('}')) ||
        (value.startsWith('[') && value.endsWith(']'))) {
        result[key] = JSON.parse(value);
      } else {
        result[key] = value;
      }
    } catch (_) {
      result[key] = value;
    }
  });
  return result;
};

export const stringifySearch = (search: Record<string, unknown>): string => {
  const params = new URLSearchParams();
  if (search && typeof search === 'object') {
    Object.entries(search).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (typeof value === 'object') {
        try {
          params.set(key, JSON.stringify(value));
        } catch (_) {
          params.set(key, String(value));
        }
      } else {
        params.set(key, String(value));
      }
    });
  }
  const str = params.toString();
  return str ? `?${str}` : '';
};
