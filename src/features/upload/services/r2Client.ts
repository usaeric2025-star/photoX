import { uploadWithRetry } from '#src/services/storage/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

export const uploadToR2 = async (userId: string = '', filename: string, fileOrUri: File | string, imageHash: string | undefined, onStatus?: (status: 'compressing' | 'uploading' | 'done') => void) => {
    return await uploadWithRetry(userId, filename, fileOrUri, imageHash, onStatus);
};
