import { uploadWithRetry } from '@/services/storage';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

export const uploadToR2 = async (userId: string, filename: string, uri: string, imageHash: string | undefined, onStatus?: (status: 'compressing' | 'uploading' | 'done') => void) => {
    return await uploadWithRetry(userId, filename, uri, imageHash, onStatus);
};
