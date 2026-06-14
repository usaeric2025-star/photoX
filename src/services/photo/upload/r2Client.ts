import { uploadWithRetry } from '../../storage';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

export const uploadToR2 = async (userId: string, filename: string, uri: string, imageHash: string | undefined, onStatus?: (s: string) => void) => {
    return await uploadWithRetry(userId, filename, uri, imageHash, onStatus as any);
};
