import { api } from '@/lib/api';
import { Photo } from '@/types/photo';

interface GroupAnalysisResult {
  name: string;
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

export async function analyzeGroup(photos: Photo[]): Promise<GroupAnalysisResult> {
  const photoDetails = photos.map(p => `- 名称: ${p.name}, 标签: ${p.tagNames?.join(',') || '无'}`).join('\n');
  
  const response = await api.ai['analyze-group'].$post({
    json: { photoDetails }
  });

  if (!response.ok) {
    const error = await response.json() as any;
    throw new Error(error.error || 'AI 智能合组分析失败');
  }

  return await response.json();
}

export async function analyzeSinglePhoto(photo: Photo): Promise<PhotoAnalysisResult> {
  const photoDetail = `- 名称: ${photo.name}\n- 现有分类: ${photo.categoryName}\n- 现有标签: ${photo.tagNames?.join(',') || '无'}\n- 描述: ${photo.description || '无'}`;
  
  const response = await api.ai['analyze-photo-v2'].$post({
    json: { photoDetail }
  });

  if (!response.ok) {
    const error = await response.json() as any;
    throw new Error(error.error || 'AI 单张识别分析失败');
  }

  return await response.json();
}
