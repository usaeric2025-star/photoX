import { match, P } from 'ts-pattern';
import { ok, err, Result } from 'neverthrow';

type DragState = 
  | { type: 'idle' }
  | { type: 'dragging'; photoIds: string[] }
  | { type: 'success'; photoIds: string[]; targetGroupId: string | null }
  | { type: 'error'; message: string };

/**
 * [COMBO-DRAG-DELTA]: Logic comparison
 * Using ts-pattern ensures all DragStates are handled.
 * Using neverthrow forces explicit error handling at the call site.
 */
export const processDragResult = (state: DragState): Result<string, Error> => {
  return match(state)
    .with({ type: 'success' }, (s) => ok(`Moved ${s.photoIds.length} to ${s.targetGroupId}`))
    .with({ type: 'error' }, (s) => err(new Error(s.message)))
    .with({ type: 'idle' }, () => err(new Error('No drag in progress')))
    .with({ type: 'dragging' }, () => err(new Error('Still dragging')))
    .exhaustive();
};

/**
 * [DUAL-DEFENSE-GAIN]: AI Maintenance Test
 * If an AI forgets the 'dragging' state, .exhaustive() will throw a compile error.
 * If an AI forgets to handle the Result return, they can't access the string value.
 */
