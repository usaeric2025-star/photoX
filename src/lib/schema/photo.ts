import { PhotoSchema as ApiPhotoSchema } from '../../../api/_shared/apiContractSchema';

export const PhotoSchema = ApiPhotoSchema;
export type Photo = typeof PhotoSchema.infer;
