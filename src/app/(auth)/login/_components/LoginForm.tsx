'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';

import { loginAction } from '@/actions/authActions';
import FormFieldError from '@/components/FormFieldError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFormToast } from '@/hooks/useFormToast';
import { emptyFormState, type FormState } from '@/types/formActions';

import Form from '../../_components/Form';
import PasswordField from '../../_components/PasswordField';

const LoginButton = () => {
  const status = useFormStatus();
  return (
    <Button type="submit" className="w-full md:w-auto" loading={status.pending}>
      Sign in
    </Button>
  );
};

const LoginForm = () => {
  const searchParameters = useSearchParams();

  // Wrapper function to extract FormData and call typed server action
  const handleSubmit = async (_previousState: unknown, formData: FormData) => {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const redirectUrl = searchParameters.get('redirect') || undefined;

    return loginAction({ email, password, redirectUrl });
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
          type="email"
          name="email"
          placeholder="name@company.com"
          required={true}
          autoComplete="username"
          disabled={isPending}
          aria-invalid={!!state.errors?.email?.at(-1)}
          aria-describedby={state.errors?.email?.at(-1) ? 'email-error' : undefined}
        />
        <FormFieldError error={state.errors?.email} fieldId="email" />
      </div>
      <PasswordField
        id="password"
        name="password"
        label="Password"
        placeholder="Your password"
        autoComplete="current-password"
        required={true}
        disabled={isPending}
        error={state.errors?.password}
      />
      <LoginButton />
    </Form>
  );
};

export default LoginForm;
