import { api } from '@/lib/api';
import { Photo } from '@/types/photo';
import { ErrorFactory } from '../../lib/error/ErrorFactory';

interface GroupAnalysisResult {
  name: { zh: string; en: string; ms: string };
  description: string;
  colors: string[];
  materials: string[];
}

interface PhotoAnalysisResult {
  name: string;
  category: string;
  tags: string[];
  colors: string[];
  materials: string[];
  description: string;
}

function formatField(field: any): string {
  if (!field) return '';
  let str = '';
  if (typeof field === 'object') {
    str = field.zh || field.en || field.ms || '';
  } else {
    str = String(field);
  }
  // Try parsing in case it is double JSON serialized or nested stringify
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      return parsed.zh || parsed.en || parsed.ms || str;
    } catch (e) {
      return str;
    }
  }
  return str;
}

export async function analyzeGroup(photos: Photo[]): Promise<GroupAnalysisResult> {
  const photoDetails = photos.map(p => {
    const nameStr = formatField(p.name);
    const descStr = formatField(p.description);
    return `- 名称: ${nameStr}, 标签: ${p.tagNames?.join(',') || '无'}, 描述: ${descStr || '无'}`;
  }).join('\n');
  
  const response = await api.ai['analyze-group'].$post({
    json: { photoDetails }
  });

  if (!response.ok) {
    const error = await response.json() as any;
    throw ErrorFactory.wrap(new Error(error.error || 'AI 智能合组分析失败'), 'analyzeGroup');
  }

  return await response.json();
}

export async function analyzeSinglePhoto(photo: Photo): Promise<PhotoAnalysisResult> {
  const nameStr = formatField(photo.name);
  const descStr = formatField(photo.description);
  const photoDetail = `- 名称: ${nameStr}\n- 现有分类: ${photo.categoryName}\n- 现有标签: ${photo.tagNames?.join(',') || '无'}\n- 描述: ${descStr || '无'}`;
  
  const response = await api.ai['analyze-photo-v2'].$post({
    json: { photoDetail }
  });

  if (!response.ok) {
    const error = await response.json() as any;
    throw ErrorFactory.wrap(new Error(error.error || 'AI 单张识别分析失败'), 'analyzeSinglePhoto', photo.id);
  }

  return await response.json();
}
