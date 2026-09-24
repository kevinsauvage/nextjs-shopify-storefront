import type * as React from 'react';

import type { FormState } from '@/types/formActions';

import { useFormToast } from './useFormToast';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { toastError, toastSuccess } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof React>();

  return {
    ...actual,
    useEffect: (effect: () => void | (() => void)): void => {
      effect();
    },
  };
});

vi.mock('sonner', () => ({
  toast: {
    error: toastError,
    success: toastSuccess,
  },
}));

beforeEach(() => {
  toastError.mockClear();
  toastSuccess.mockClear();
});

describe('useFormToast', () => {
  it('shows nothing when there is no message', () => {
    const state: FormState = { ok: true };

    useFormToast(state);

    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('shows a success toast for an ok state with a message', () => {
    const state: FormState = { message: 'Saved', ok: true };

    useFormToast(state);

    expect(toastSuccess).toHaveBeenCalledWith('Saved');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('shows an error toast for a failed state with a message', () => {
    const state: FormState = { message: 'Something went wrong', ok: false };

    useFormToast(state);

    expect(toastError).toHaveBeenCalledWith('Something went wrong');
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
