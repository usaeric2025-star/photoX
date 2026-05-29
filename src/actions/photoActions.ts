import { Photo, ProductFormData } from '../types';
import { createPhotoValidator } from '../lib/validators/factory';
import { photoMutationService } from '../services/photoMutationService';
import { Result, err, ok, isErr } from '../lib/errorFactory';
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
): Promise<Result<Photo, StandardError>> {
  const validator = createPhotoValidator();
  
  // 1. Validation
  const validationResult = validator.validate({ ...data, id });
  if (isErr(validationResult)) {
    return err(validationResult.error);
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
    return ok({ id, ...data } as any);
  } catch (error: any) {
    return err(new StandardError(error.message || 'Update failed', {
      path: ['server'],
      aiDebugHint: 'Check supabase/R2 connectivity and snake_case mapping.'
    }));
  }
}
