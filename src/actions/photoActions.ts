import { Photo, ProductFormData } from '../types';
import { createPhotoValidator } from '../lib/validators/factory';
import { photoMutationService } from '../services/photoMutationService';
import { AppResult, errorFactory, success, isErr } from '../lib/errorFactory';
import { StandardError } from '../lib/validators/protocol';

/**
 * [V2.8-FORM-PARADYM]
 * Server Action style function for photo updates.
 * Integrated with the Validator protocol.
 */
export async function updatePhotoAction(
  id: string, 
  data: ProductFormData,
  imageUri?: string | null
): Promise<AppResult<Photo>> {
  const validator = createPhotoValidator();
  
  // 1. Validation
  const validationResult = validator.validate({ ...data, id });
  if (isErr(validationResult)) {
    return errorFactory(validationResult.message, 'VALIDATION_ERROR', 'Validation failed');
  }

  // 2. Execution (via Mutation Service)
  try {
    const updates: any = { ...data };
    if (imageUri) {
      updates.uri = imageUri;
    }
    
    // photoMutationService should already be following the Red Line rules
    await photoMutationService.update(id, updates);
    
    // In a real server action, we'd return the updated object
    // Here we just return success with a placeholder or refetched data if needed
    return success({ id, ...data } as any);
  } catch (error: any) {
    return errorFactory(error.message || 'Update failed', 'UNKNOWN', 'Update failed', error);
  }
}
