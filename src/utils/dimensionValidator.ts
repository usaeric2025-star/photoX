export interface Dimension {
  value?: number;
  unit?: string | null;
}

export function validateDimension(dim: Dimension | null | undefined): Dimension | null {
  if (!dim || typeof dim.value !== 'number') return dim || null;
  
  const value = dim.value;
  const aiUnit = dim.unit?.toLowerCase().trim();
  
  if (aiUnit === 'inch' || aiUnit === 'in' || aiUnit === 'inc') return { ...dim, unit: 'inch' };
  if (aiUnit === 'mm') return { ...dim, unit: 'mm' };
  
  if (value > 200) return { ...dim, unit: 'mm' };
  if (value > 50) return { ...dim, unit: 'cm' };
  if (value <= 0) return { ...dim, unit: 'cm' };
  return { ...dim, unit: 'cm' };
}
