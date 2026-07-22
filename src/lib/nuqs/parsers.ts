export const parseAsString = {
  parse: (val: string | null) => val || '',
  serialize: (val: string) => val,
};

export const searchParser = {
  parse: (val: string | null) => val || '',
  serialize: (val: string) => val,
};

export const categoryParser = {
  parse: (val: string | null) => val || '',
  serialize: (val: string) => val,
};

export const categoriesParser = {
  parse: (val: string | null) => (val ? val.split(',').filter(Boolean) : null),
  serialize: (val: string[]) => val.join(','),
};

export const tagsParser = {
  parse: (val: string | null) => (val ? val.split(',').filter(Boolean) : null),
  serialize: (val: string[]) => val.join(','),
};

export const sortParser = {
  parse: (val: string | null) => val || 'newest',
  serialize: (val: string) => val,
};

export const groupIdParser = {
  parse: (val: string | null) => val || '',
  serialize: (val: string) => val,
};

export const groupsParser = {
  parse: (val: string | null) => (val ? val.split(',').filter(Boolean) : null),
  serialize: (val: string[]) => val.join(','),
};

export const batchParser = {
  parse: (val: string | null) => val === 'true' || val === '1',
  serialize: (val: boolean) => (val ? 'true' : ''),
};

export const selectedIdsParser = {
  parse: (val: string | null) => (val ? val.split(',').filter(Boolean) : null),
  serialize: (val: string[]) => val.join(','),
};

export const showGroupsCollapsedParser = {
  parse: (val: string | null) => (val === null ? true : val === 'true'),
  serialize: (val: boolean) => (val ? 'true' : 'false'),
};

export const anchorParser = {
  parse: (val: string | null) => val || '',
  serialize: (val: string) => val,
};

export const modalParser = {
  parse: (val: string | null) => val || 'none',
  serialize: (val: string) => val,
};

export const parseAsPhotoId = {
  parse: (val: string | null) => val || '',
  serialize: (val: string) => val,
};

export const columnsParser = {
  parse: (val: string | null) => val || '',
  serialize: (val: string) => val,
};

export const tabParser = {
  parse: (val: string | null) => val || '',
  serialize: (val: string) => val,
};

export const parseAsArray = {
  parse: (val: string | null) => (val ? val.split(',').filter(Boolean) : []),
  serialize: (val: string[]) => val.join(','),
};
