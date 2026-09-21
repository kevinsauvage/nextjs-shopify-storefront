'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { resetPasswordAction } from '@/actions/authActions';
import { Button } from '@/components/ui/button';
import { useFormToast } from '@/hooks/useFormToast';
import { emptyFormState,type FormState } from '@/types/formActions';

import Form from '../../_components/Form';
import PasswordField from '../../_components/PasswordField';

const initialStates = {
  password: '',
};

const ResetButton = () => {
  const status = useFormStatus();
  return (
    <Button type="submit" loading={status.pending}>
      Reset password
    </Button>
  );
};

const ResetForm = ({ resetUrl }: { resetUrl: string }) => {
  const [formData, setFormData] = useState(initialStates);

  const handleSubmit = async (_previousState: unknown, formData_: FormData) => {
    const password = formData_.get('password') as string;
    return resetPasswordAction({ password, resetUrl });
  };

  const [state, action, isPending] = useActionState<FormState, FormData>(
    handleSubmit,
    emptyFormState,
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value || '' }));
  };

  useFormToast(state);

  return (
    <Form action={action} autoComplete="off" className="space-y-5">
      <PasswordField
        id="password"
        name="password"
        label="New password"
        placeholder="Create a new password"
        autoComplete="new-password"
        required={true}
        onChange={handleChange}
        value={formData.password}
        disabled={isPending}
        error={state.errors?.password}
      />
      <p className="text-body-sm text-secondary">
        Use at least 8 characters. Consider mixing letters, numbers, and symbols.
      </p>
      <ResetButton />
    </Form>
  );
};

export default ResetForm;
