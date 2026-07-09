import { api } from '#lib/api.js';
import { PhotoRecord } from './types.js';

/**
 * Save photo record to database
 */
export async function savePhoto(record: PhotoRecord): Promise<string> {
  const res = await api.photos.upsert.$post({
    json: {
      payload: {
        id: record.id,
        imageUrl: record.imageUrl,
        imageHash: record.imageHash,
        width: record.width,
        height: record.height,
        name: record.name,
        description: record.description,
        manualCode: record.manualCode,
        groupId: record.groupId
      }
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DB Save failed: ${res.status} - ${text}`);
  }

  const data = await res.json() as any;
  if (!data.success) throw new Error(data.error || 'Database save failed');
  
  return data.data?.id || data.id;
}
