import { registerDiagnostic, DiagnosticTest } from './index';
import { expect, it } from 'vitest';
import { createPhotoValidator, createGroupValidator } from '@/lib/validators/factory';

const validatorParityTest: DiagnosticTest = {
    id: 'validator_parity',
    name: 'Validator Metadata Parity',
    description: 'Ensures the AI-Native Validator Meta stays in sync with logical schemas.',
    run: async () => {
        const start = Date.now();
        try {
            const photoValidator = createPhotoValidator();
            const photoMeta = photoValidator.serialize();
            if (!photoMeta.fields.id || !photoMeta.fields.user_id) throw new Error('Photo Meta Incomplete');

            const groupValidator = createGroupValidator();
            const groupMeta = groupValidator.serialize();
            if (!groupMeta.fields.id || !groupMeta.fields.user_id) throw new Error('Group Meta Incomplete');

            return { passed: true, message: 'Validator Parity OK', durationMs: Date.now() - start };
        } catch (e) {
            return { passed: false, message: String(e), durationMs: Date.now() - start };
        }
    }
};

registerDiagnostic(validatorParityTest);

it('Photo Validator Parity', () => {
  const validator = createPhotoValidator();
  const meta = validator.serialize();
  expect(meta.fields.id).toBeDefined();
  expect(meta.fields.user_id).toBeDefined();
});

it('Group Validator Parity', () => {
  const validator = createGroupValidator();
  const meta = validator.serialize();
  expect(meta.fields.id).toBeDefined();
  expect(meta.fields.user_id).toBeDefined();
});
