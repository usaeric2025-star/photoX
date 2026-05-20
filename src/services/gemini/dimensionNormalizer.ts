import { Dimension } from '../../types';

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
      
      let length = 0;
      let width = 0;
      let height = 0;

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
        const hMatch = parsingPart.match(/H\s*[:：=x*]?\s*(\d+(\.\d+)?)/i);
        const wMatch = parsingPart.match(/W\s*[:：=x*]?\s*(\d+(\.\d+)?)/i);
        const lMatch = parsingPart.match(/L\s*[:：=x*]?\s*(\d+(\.\d+)?)/i);
        const dMatch = parsingPart.match(/D\s*[:：=x*]?\s*(\d+(\.\d+)?)/i);

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
        // 2️⃣ Pattern fallback: height -> length -> width
        height = parseFloat(nums[0]);
        if (nums.length >= 2) length = parseFloat(nums[1]);
        if (nums.length >= 3) width = parseFloat(nums[2]);
      }
      
      const isAIEstimated = !!(d && (d.isAIEstimated === true || /AI/i.test(originalLabel)));
      
      let cleanedLabel = originalLabel.replace(/[\u4e00-\u9fa5]+/g, '')
                                       .replace(/(cm|mm|inch|in|寸|["'”])/gi, '')
                                       .trim();

      // For Option 2 (Visual Estimation): Append " (AI)" cleanly to the label if it's visually estimated
      if (isAIEstimated) {
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
        isAI: true,
        isAIEstimated
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

      const currentFillCount = (current.height > 0 ? 1 : 0) + (current.width > 0 ? 1 : 0) + (current.length > 0 ? 1 : 0);
      const nextFillCount = (d.height > 0 ? 1 : 0) + (d.width > 0 ? 1 : 0) + (d.length > 0 ? 1 : 0);

      const shouldMerge = !hasOverlap && bothAreIncomplete && (
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
  
  return merged;
};
