import { Category, Photo, Tag, Manufacturer } from '../types';
import { safeArray } from '../lib/utils';

export const shouldUpdateName = (name: string | null | undefined): boolean => {
  if (!name || name.trim() === '') return true;
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  
  if (/^[\d\s\-_]+$/.test(trimmed)) return true;
  if (
    lower === 'furniture' ||
    lower === '未命名产品' ||
    lower === 'furniture record' ||
    /\.(jpg|jpeg|png|heic|webp)$/i.test(trimmed) ||
    /^(img|image|photo|dsc|pic)[\s_-]?\d+/i.test(lower)
  ) return true;
  if (trimmed.length < 3) return true;
  return false;
};

export const cleanAiName = (name: string | null | undefined): string | null => {
  if (!name) return null;
  const trimmed = name.trim();
  const measurementPattern = /([hwdlt]\d+)|(\d+["”']|cm|inch|mm)|(\d+\s*x\s*\d+)/i;
  
  if (measurementPattern.test(trimmed)) {
    return null;
  }
  return trimmed;
};

export const createTempPhoto = (hash: string, dataUrl: string, fileName: string, fileSize: number, fileLastModified: number): Photo => {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    storage_id: hash, 
    item_code: '', // Will be generated
    manual_code: '',
    image_hash: hash,
    name: fileName.split('.')[0] || '未命名产品',
    description: '',
    image_url: '',
    uri: dataUrl,
    category_id: null,
    manufacturer_id: null,
    tag_ids: [],
    created_at: new Date().toISOString(),
    group_id: null,
    is_analyzing: false,
    is_hidden: false,
    _fileName: fileName,
    _fileSize: fileSize,
    _lastModified: fileLastModified
  } as any;
};
