import {
  createErrorResult,
  createSuccessResult,
  handleCustomerUserErrors,
  handleUserErrors,
  zodErrorsToFormActionResult,
} from './form-actions';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

describe('form-actions', () => {
  it('maps Zod errors to field errors', () => {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse({ email: 'not-an-email' });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(zodErrorsToFormActionResult(parsed.error).fieldErrors).toEqual({
      email: ['Invalid email'],
    });
  });

  it('returns customer user errors only when present', () => {
    const errors = [{ code: 'INVALID', field: null, message: 'Bad' }] as never[];

    expect(handleCustomerUserErrors(errors)).toEqual({ customerUserErrors: errors });
    expect(handleCustomerUserErrors([])).toBeNull();
    expect(handleCustomerUserErrors(undefined)).toBeNull();
  });

  it('returns user errors only when present', () => {
    const errors = [{ code: 'INVALID', field: null, message: 'Bad' }] as never[];

    expect(handleUserErrors(errors)).toEqual({ userErrors: errors });
    expect(handleUserErrors([])).toBeNull();
  });

  it('creates standardized results', () => {
    expect(createErrorResult('boom')).toEqual({ error: 'boom' });
    expect(createSuccessResult('ok')).toEqual({ success: 'ok' });
  });
});
