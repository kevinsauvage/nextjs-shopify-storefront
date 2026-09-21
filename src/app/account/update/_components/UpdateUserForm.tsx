'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { updateUserAction } from '@/actions/usersActions';
import FormFieldError from '@/components/FormFieldError';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { userFeedback } from '@/data/userFeedback';
import { useFormStatesEffect } from '@/hooks/useFormStatesEffect';
import type { CustomerUserError, GetCustomerQuery } from '@/shopify/storefront';

const SubmitButton = () => {
  const status = useFormStatus();
  return (
    <Button type="submit" loading={status.pending}>
      Save changes
    </Button>
  );
};

const UpdateUserForm = ({
  user,
}: {
  user: GetCustomerQuery['customer'] | null | undefined;
}) => {
  const handleSubmit = async (_previousState: unknown, formData: FormData) => {
    if (!user) return { error: 'User not found' };

    const email = formData.get('email') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const phone = formData.get('phone') as string;
    const acceptsMarketing = formData.get('acceptsMarketing') as string;

    return updateUserAction({ acceptsMarketing, email, firstName, lastName, phone });
  };

  const [states, action, isPending] = useActionState<
    {
      firstName?: string | string[];
      lastName?: string | string[];
      phone?: string | string[];
      company?: string | string[];
      acceptsMarketing?: string | string[];
      customerUserErrors?: CustomerUserError[];
      error?: string;
      success?: string;
    },
    FormData
  >(handleSubmit, {});

  const [acceptsMarketing, setAcceptsMarketing] = useState(() => user?.acceptsMarketing ?? false);

  useFormStatesEffect({
    states: states || {},
    userFeedback: {
      error: userFeedback.login.error,
      success: userFeedback.login.success,
    },
  });

  return (
    <form action={action} className="space-y-8">
      {user && (
        <>
          <input type="hidden" name="email" value={user.email ?? ''} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                name="firstName"
                defaultValue={user.firstName ?? ''}
                disabled={isPending}
                aria-invalid={!!states?.firstName?.length}
                aria-describedby={states?.firstName?.length ? 'firstName-error' : undefined}
              />
              <FormFieldError error={states?.firstName} fieldId="firstName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                name="lastName"
                defaultValue={user.lastName ?? ''}
                disabled={isPending}
                aria-invalid={!!states?.lastName?.length}
                aria-describedby={states?.lastName?.length ? 'lastName-error' : undefined}
              />
              <FormFieldError error={states?.lastName} fieldId="lastName" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" disabled defaultValue={user.email ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="text"
                name="phone"
                defaultValue={user.phone ?? ''}
                disabled={isPending}
                aria-invalid={!!states?.phone?.length}
                aria-describedby={states?.phone?.length ? 'phone-error' : undefined}
              />
              <FormFieldError error={states?.phone} fieldId="phone" />
            </div>
          </div>
        </>
      )}

      <Label htmlFor="acceptsMarketing">
        <Checkbox
          name="acceptsMarketing"
          defaultChecked={acceptsMarketing}
          value={acceptsMarketing ? 'true' : 'false'}
          checked={acceptsMarketing}
          onCheckedChange={(checked) => {
            setAcceptsMarketing(checked as boolean);
          }}
          id="acceptsMarketing"
          disabled={isPending}
        />
        <p>Subscribe to receive updates and special offers</p>
      </Label>
      <SubmitButton />
    </form>
  );
};

export default UpdateUserForm;
