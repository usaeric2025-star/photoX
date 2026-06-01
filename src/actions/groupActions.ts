import { AppResult, errorFactory, success, fromThrowableAsync } from '../lib/errorFactory';
import { groupMutationService } from '../services/groupMutationService';
import { createGroupValidator } from '../lib/validators/factory';
import { ProductGroup } from '../types';

/**
 * [V2.8-FORM-PARADYM]
 * Server Action style function for group updates.
 */
export async function updateGroupAction(
  id: string, 
  data: Partial<ProductGroup>
): Promise<AppResult<ProductGroup>> {
  const validator = createGroupValidator();
  
  // 1. Validation
  const validationResult = validator.validate(data);
  if (!validationResult.ok) {
    return validationResult;
  }

  // 2. Execution
  const result = await fromThrowableAsync(() => groupMutationService.update(id, data), 'updateGroupAction');
  if (!result.ok) {
    return errorFactory(result.message, 'DB_ERROR', 'updateGroupAction', result.cause);
  }

  return success({ id, ...data } as ProductGroup);
}

/**
 * [V2.8-FORM-PARADYM]
 * Server Action style function for group creation.
 */
export async function createGroupAction(
  data: ProductGroup
): Promise<AppResult<ProductGroup>> {
  const validator = createGroupValidator();
  
  // 1. Validation
  const validationResult = validator.validate(data);
  if (!validationResult.ok) {
    return validationResult;
  }

  // 2. Execution
  const result = await fromThrowableAsync(() => groupMutationService.create(data), 'createGroupAction');
  if (!result.ok) {
    return errorFactory(result.message, 'DB_ERROR', 'createGroupAction', result.cause);
  }

  return success(result.data);
}
