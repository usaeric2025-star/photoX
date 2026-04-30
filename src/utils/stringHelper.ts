export function normalizeTagName(name: string): string {
  return name?.trim().toUpperCase() || '';
}

export function normalizeManufacturerName(name: string): string {
  return name?.trim().toUpperCase() || '';
}

export function normalizeSearchQuery(query: string): string {
  return query?.trim() || '';
}
