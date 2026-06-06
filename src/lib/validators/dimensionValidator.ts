export function normalizeUnit(unit: string | null | undefined): string {
  const u = unit?.toLowerCase().trim();
  if (u === 'in' || u === 'inches' || u === 'inch') return 'inch';
  if (u === 'cm' || u === 'centimeter' || u === 'centimetres') return 'cm';
  if (u === 'mm' || u === 'millimeter' || u === 'millimetres') return 'mm';
  if (u === 'm' || u === 'meter' || u === 'metres') return 'm';
  return u || 'cm';
}

export function validateDimension(dim: any): any {
  if (!dim) return null;
  const value = dim.value ?? dim.height ?? dim.width ?? dim.length ?? 0;
  const unit = normalizeUnit(dim.unit);
  
  return {
    ...dim,
    unit,
    height: Number(dim.height || (dim.label?.includes('H') ? value : 0)) || 0,
    width: Number(dim.width || (dim.label?.includes('W') ? value : 0)) || 0,
    length: Number(dim.length || (dim.label?.includes('D') || dim.label?.includes('L') ? value : 0)) || 0
  };
}
