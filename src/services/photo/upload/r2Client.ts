import { uploadWithRetry } from '../../storage';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

export const uploadToR2 = async (userId: string, filename: string, uri: string, imageHash: string | undefined, onStatus?: (s: string) => void) => {
    const res = await uploadWithRetry(userId, filename, uri, imageHash, onStatus);
    if (!res.ok) {
        throw ErrorFactory.wrap(new Error(res.message), 'uploadToR2', filename);
    }
    return res.data;
};
