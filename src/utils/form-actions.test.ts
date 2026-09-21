import {
  formError,
  formSuccess,
  handleCustomerUserErrors,
  handleUserErrors,
  serviceErrorsToFormState,
  shopifyErrorsToFormState,
  zodErrorsToFormState,
} from './form-actions';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

describe('form-actions', () => {
  it('maps Zod errors to field errors', () => {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse({ email: 'not-an-email' });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(zodErrorsToFormState(parsed.error)).toEqual({
      errors: { email: ['Invalid email'] },
      ok: false,
    });
  });

  it('builds error and success states', () => {
    expect(formError('boom')).toEqual({ message: 'boom', ok: false });
    expect(formSuccess('ok')).toEqual({ message: 'ok', ok: true });
    expect(formSuccess()).toEqual({ message: undefined, ok: true });
  });

  it('collapses Shopify errors into a single message', () => {
    expect(shopifyErrorsToFormState([{ message: 'Bad' }, { message: 'Worse' }])).toEqual({
      message: 'Bad Worse',
      ok: false,
    });
    expect(shopifyErrorsToFormState([])).toBeNull();
    expect(shopifyErrorsToFormState(undefined)).toBeNull();
  });

  it('maps service results to form state', () => {
    expect(serviceErrorsToFormState({ error: 'Nope' })).toEqual({ message: 'Nope', ok: false });
    expect(serviceErrorsToFormState({ customerUserErrors: [{ message: 'Bad' }] })).toEqual({
      message: 'Bad',
      ok: false,
    });
    expect(serviceErrorsToFormState({ userErrors: [{ message: 'Bad' }] })).toEqual({
      message: 'Bad',
      ok: false,
    });
    expect(serviceErrorsToFormState({ success: true })).toBeNull();
  });

  it('returns customer/user errors only when present', () => {
    const errors = [{ code: 'INVALID', field: null, message: 'Bad' }] as never[];

    expect(handleCustomerUserErrors(errors)).toEqual({ customerUserErrors: errors });
    expect(handleCustomerUserErrors([])).toBeNull();
    expect(handleCustomerUserErrors(undefined)).toBeNull();

    expect(handleUserErrors(errors)).toEqual({ userErrors: errors });
    expect(handleUserErrors([])).toBeNull();
  });
});
