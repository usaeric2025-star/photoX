import { api } from '#lib/api.js';
import { PhotoRecord } from './types.js';
import { ErrorFactory } from '#src/lib/error/ErrorFactory.js';

/**
 * Save photo record to database
 */
export async function savePhoto(record: PhotoRecord): Promise<string> {
  const data = await ErrorFactory.unwrap<{ id: string }>(
    api.photos.upsert.$post({
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
    }),
    'Database save failed'
  );

  return data.id;
}
