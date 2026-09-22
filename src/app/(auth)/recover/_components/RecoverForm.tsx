'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { recoverPasswordAction } from '@/actions/authActions';
import FormFieldError from '@/components/FormFieldError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFormToast } from '@/hooks/useFormToast';
import { emptyFormState, type FormState } from '@/types/formActions';

import Form from '../../_components/Form';

const SubmitButton = () => {
  const status = useFormStatus();
  return (
    <Button type="submit" loading={status.pending}>
      Send reset link
    </Button>
  );
};

const RecoverForm = () => {
  const handleSubmit = async (_previousState: unknown, formData: FormData) => {
    const email = formData.get('email') as string;
    return recoverPasswordAction({ email });
  };

  const [state, action, isPending] = useActionState<FormState, FormData>(
    handleSubmit,
    emptyFormState,
  );

  useFormToast(state);

  return (
    <Form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="name@company.com"
          required={true}
          disabled={isPending}
          aria-invalid={!!state.errors?.email?.at(-1)}
          aria-describedby={state.errors?.email?.at(-1) ? 'email-error' : undefined}
        />
        <p className="text-body-sm text-secondary">
          We&apos;ll email you a secure link to reset your password.
        </p>
        <FormFieldError error={state.errors?.email} fieldId="email" />
      </div>

      <SubmitButton />
    </Form>
  );
};

export default RecoverForm;
