export type FormFieldErrors = Partial<Record<string, string[]>>;

/**
 * Standardized result/state for every form action.
 *
 * A single shape keeps server actions and client forms in sync: field-level
 * validation errors live in `errors`, everything user-facing lives in `message`.
 */
export type FormState = {
  ok: boolean;
  errors?: FormFieldErrors;
  message?: string;
};

export const emptyFormState: FormState = { ok: true };
