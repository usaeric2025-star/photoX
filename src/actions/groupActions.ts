import { ProductGroup } from '../types';
import { createGroupValidator } from '../lib/validators/factory';
import { groupMutationService } from '../services/groupMutationService';
import { Result, err, ok } from 'neverthrow';
import { StandardError } from '../lib/validators/protocol';

/**
 * [V2.8-FORM-PARADYM]
 * Server Action style function for group updates.
 */
export async function updateGroupAction(
  id: string, 
  data: Partial<ProductGroup>
): Promise<Result<ProductGroup, StandardError>> {
  const validator = createGroupValidator();
  
  // 1. Validation
  const validationResult = validator.validate(data);
  if (validationResult.isErr()) {
    return err(validationResult.error);
  }

  // 2. Execution
  try {
    await groupMutationService.update(id, data);
    return ok({ id, ...data } as ProductGroup);
  } catch (error: any) {
    return err({
      message: error.message || 'Update failed',
      path: ['server'],
      aiDebugHint: 'Check group table permissions and snake_case naming.'
    });
  }
}

/**
 * [V2.8-FORM-PARADYM]
 * Server Action style function for group creation.
 */
export async function createGroupAction(
  data: ProductGroup
): Promise<Result<ProductGroup, StandardError>> {
  const validator = createGroupValidator();
  
  // 1. Validation
  const validationResult = validator.validate(data);
  if (validationResult.isErr()) {
    return err(validationResult.error);
  }

  try {
    const group = await groupMutationService.create(data);
    return ok(group);
  } catch (error: any) {
    return err({
      message: error.message || 'Creation failed',
      path: ['server'],
      aiDebugHint: 'Check bucket limits or column constraints.'
    });
  }
}
