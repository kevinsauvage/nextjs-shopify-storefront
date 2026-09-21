import { useEffect } from 'react';

import type { FormState } from '@/types/formActions';

import { toast } from 'sonner';

/**
 * Shows a toast whenever an action returns a message. Field-level errors are
 * rendered inline by `FormFieldError`.
 */
export function useFormToast(state: FormState): void {
  useEffect(() => {
    if (!state.message) return;

    if (state.ok) {
      toast.success(state.message);
    } else {
      toast.error(state.message);
    }
  }, [state]);
}
