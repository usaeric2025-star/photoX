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
  if (aiUnit === 'cm') return { ...dim, unit: 'cm' };
  if (aiUnit === 'm') return { ...dim, unit: 'm' || 'cm' };
  
  // If no unit provided, apply simple heuristics but prefer cm
  if (!aiUnit) {
    if (value > 300) return { ...dim, unit: 'mm' };
    return { ...dim, unit: 'cm' };
  }
  
  return dim;
}
