'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { updateUserAction } from '@/actions/usersActions';
import FormFieldError from '@/components/FormFieldError';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFormToast } from '@/hooks/useFormToast';
import type { GetCustomerQuery } from '@/shopify/storefront';
import { emptyFormState, type FormState } from '@/types/formActions';
import { formError } from '@/utils/form-actions';

const SubmitButton = () => {
  const status = useFormStatus();
  return (
    <Button type="submit" loading={status.pending}>
      Save changes
    </Button>
  );
};

const UpdateUserForm = ({ user }: { user: GetCustomerQuery['customer'] | null | undefined }) => {
  const handleSubmit = async (_previousState: unknown, formData: FormData) => {
    if (!user) return formError('User not found');

    const email = formData.get('email') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const phone = formData.get('phone') as string;
    const acceptsMarketing = formData.get('acceptsMarketing') as string;

    return updateUserAction({ acceptsMarketing, email, firstName, lastName, phone });
  };

  const [state, action, isPending] = useActionState<FormState, FormData>(
    handleSubmit,
    emptyFormState,
  );

  const [acceptsMarketing, setAcceptsMarketing] = useState(() => user?.acceptsMarketing ?? false);

  useFormToast(state);

  return (
    <form action={action} className="space-y-8">
      {user && (
        <>
          <input type="hidden" name="email" value={user.email ?? ''} />

          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-heading-4">Personal details</h3>
              <p className="text-body-sm text-secondary">
                Update your name and contact information.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  type="text"
                  name="firstName"
                  placeholder="First name"
                  defaultValue={user.firstName ?? ''}
                  disabled={isPending}
                  aria-invalid={!!state.errors?.firstName?.length}
                  aria-describedby={state.errors?.firstName?.length ? 'firstName-error' : undefined}
                />
                <FormFieldError error={state.errors?.firstName} fieldId="firstName" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  type="text"
                  name="lastName"
                  placeholder="Last name"
                  defaultValue={user.lastName ?? ''}
                  disabled={isPending}
                  aria-invalid={!!state.errors?.lastName?.length}
                  aria-describedby={state.errors?.lastName?.length ? 'lastName-error' : undefined}
                />
                <FormFieldError error={state.errors?.lastName} fieldId="lastName" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  placeholder="Phone"
                  defaultValue={user.phone ?? ''}
                  disabled={isPending}
                  aria-invalid={!!state.errors?.phone?.length}
                  aria-describedby={state.errors?.phone?.length ? 'phone-error' : undefined}
                />
                <FormFieldError error={state.errors?.phone} fieldId="phone" />
              </div>
            </div>
          </div>

          <Label
            htmlFor="acceptsMarketing"
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 font-normal transition-colors hover:bg-muted/50"
          >
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
              className="mt-0.5"
            />
            <span className="space-y-0.5">
              <span className="block text-body-sm font-medium">Email me about news and offers</span>
              <span className="block text-body-sm text-secondary">
                Receive updates about new arrivals, sales, and exclusive offers.
              </span>
            </span>
          </Label>
        </>
      )}

      <div className="flex justify-end border-t border-border pt-6">
        <SubmitButton />
      </div>
    </form>
  );
};

export default UpdateUserForm;
