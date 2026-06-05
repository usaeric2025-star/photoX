import { Dimension } from '../../types';

export function isPlaceholderDimension(dim: Partial<Dimension> | null | undefined): boolean {
  if (!dim) return true;
  const lengthVal = Number(dim.length) || 0;
  const widthVal = Number(dim.width) || 0;
  const heightVal = Number(dim.height) || 0;

  // If all numeric values are 0, it's a placeholder/incomplete data
  if (lengthVal === 0 && widthVal === 0 && heightVal === 0) {
    return true;
  }
  
  const label = String(dim.label || '').trim();
  if (label === '' || label === '-') return true;

  return false;
}

/**
 * AI Recognition Dimensions Automatic Cleaning Function
 * Ensures length/width/height fields are preserved and data is clean.
 */
export const normalizeDimensions = (dims: Dimension[]): Dimension[] => {
  if (!Array.isArray(dims) || dims.length === 0) return [];

  const rawProcessed = dims
    .map(d => {
      if (!d) return null;
      const originalLabel = typeof d === 'string' ? d : String(d.label || '');
      
      let length = d && typeof d.length === 'number' ? d.length : Number(d?.length) || 0;
      let width = d && typeof d.width === 'number' ? d.width : Number(d?.width) || 0;
      let height = d && typeof d.height === 'number' ? d.height : Number(d?.height) || 0;

      const hasPreparsed = length > 0 || width > 0 || height > 0;

      if (!hasPreparsed) {
        // Handle part name separation (e.g. "WD: H..." -> parse dimensions from "H...")
        let parsingPart = originalLabel;
        const partPrefixMatch = originalLabel.match(/^([A-Z]+):\s*(.*)/);
        if (partPrefixMatch) {
          parsingPart = partPrefixMatch[2];
        }

        const nums = parsingPart.match(/(\d+(\.\d+)?)/g) || [];
        const hasH = /H/i.test(parsingPart);
        const hasW = /W/i.test(parsingPart);
        const hasD = /D/i.test(parsingPart);
        const hasL = /L/i.test(parsingPart);

        if (hasH || hasW || hasD || hasL) {
          // 1️⃣ Strict identification by labels (H/W/D/L)
          const hMatch = parsingPart.match(/H\s*[:：=x*]?\s*(\d+(\.\d+)?)\s*(cm|mm|in|inch|寸)?/i);
          const wMatch = parsingPart.match(/W\s*[:：=x*]?\s*(\d+(\.\d+)?)\s*(cm|mm|in|inch|寸)?/i);
          const lMatch = parsingPart.match(/L\s*[:：=x*]?\s*(\d+(\.\d+)?)\s*(cm|mm|in|inch|寸)?/i);
          const dMatch = parsingPart.match(/D\s*[:：=x*]?\s*(\d+(\.\d+)?)\s*(cm|mm|in|inch|寸)?/i);

          if (hMatch) height = parseFloat(hMatch[1]);
          
          if (wMatch && lMatch) {
            width = parseFloat(wMatch[1]);
            length = parseFloat(lMatch[1]);
          } else if (wMatch) {
            width = parseFloat(wMatch[1]);
          } else if (lMatch) {
            length = parseFloat(lMatch[1]);
          }

          if (dMatch) {
            const depthVal = parseFloat(dMatch[1]);
            if (length === 0) length = depthVal;
            else if (width === 0) width = depthVal;
          }
        } else if (nums.length > 0) {
          // 2️⃣ Pattern fallback: length -> width -> height (Standard LWH)
          length = parseFloat(nums[0] || '0');
          if (nums.length >= 2) width = parseFloat(nums[1] || '0');
          if (nums.length >= 3) height = parseFloat(nums[2] || '0');
        }
      }
      
      const is_ai_estimated = !!(d && (d.is_ai_estimated === true || /AI/i.test(originalLabel)));
      
      let cleanedLabel = originalLabel.replace(/[\u4e00-\u9fa5]+/g, '')
                                       .replace(/(cm|mm|inch|in|寸|["'”])/gi, '')
                                       .trim();

      // For Option 2 (Visual Estimation): Append " (AI)" cleanly to the label if it's visually estimated
      if (is_ai_estimated) {
        const baseLabel = cleanedLabel.replace(/\s*\(\s*AI\s*\)/i, '').trim();
        cleanedLabel = `${baseLabel} (AI)`.trim();
      }

      return { 
        ...d, 
        label: cleanedLabel,
        unit: d.unit === 'inch' ? 'inch' : 'cm',
        length,
        width,
        height,
        is_ai: true,
        is_ai_estimated
      };
    })
    .filter(Boolean) as Dimension[];

  const merged: Dimension[] = [];
  let current: Dimension | null = null;

  for (const d of rawProcessed) {
    if (!current) {
      current = { ...d };
    } else {
      const hasOverlap = 
        (d.height > 0 && current.height > 0) ||
        (d.width > 0 && current.width > 0) ||
        (d.length > 0 && current.length > 0);
      
      const bothAreIncomplete = 
        (current.height === 0 || current.width === 0 || current.length === 0) &&
        (d.height === 0 || d.width === 0 || d.length === 0);

      const isSimpleLabel = (s: string) => /^(H|W|D|L|Height|Width|Depth|Length)\s*[:：]?\s*\d+(\.\d+)?\s*(cm|mm|inch|in|")?$/i.test(s.trim());

      const labelDiffers = current.label && d.label && 
                          current.label.toLowerCase().trim() !== d.label.toLowerCase().trim() &&
                          !isSimpleLabel(current.label) && !isSimpleLabel(d.label);

      const currentFillCount = (current.height > 0 ? 1 : 0) + (current.width > 0 ? 1 : 0) + (current.length > 0 ? 1 : 0);
      const nextFillCount = (d.height > 0 ? 1 : 0) + (d.width > 0 ? 1 : 0) + (d.length > 0 ? 1 : 0);

      const shouldMerge = !hasOverlap && bothAreIncomplete && !labelDiffers && (
        isSimpleLabel(d.label) || 
        isSimpleLabel(current.label) || 
        (currentFillCount + nextFillCount <= 3)
      );

      if (shouldMerge) {
        if (d.height > 0) current.height = d.height;
        if (d.width > 0) current.width = d.width;
        if (d.length > 0) current.length = d.length;
        if (current.label && d.label && !current.label.includes(d.label)) {
          current.label = `${current.label} ${d.label}`.trim();
        } else if (!current.label) {
          current.label = d.label;
        }
        if (d.unit === 'inch') current.unit = 'inch';
      } else {
        merged.push(current);
        current = { ...d };
      }
    }
  }
  if (current) merged.push(current);
  
  return merged.filter(d => !isPlaceholderDimension(d));
};
