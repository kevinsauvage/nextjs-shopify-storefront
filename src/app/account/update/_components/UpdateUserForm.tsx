'use client';

import { useState, useTransition } from 'react';

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

const UpdateUserForm = ({ user }: { user: GetCustomerQuery['customer'] | null | undefined }) => {
  // Seeded from the server once, then owned by the customer for the form's
  // lifetime. Nothing re-syncs it from props.
  const [acceptsMarketing, setAcceptsMarketing] = useState(() => user?.acceptsMarketing ?? false);
  const [state, setState] = useState<FormState>(emptyFormState);
  const [isPending, startTransition] = useTransition();

  useFormToast(state);

  // Called from `onSubmit`, not attached as `<form action>`: a form action
  // makes React 19 run its automatic `form.reset()` after the submission, which
  // resets the Radix Checkbox's hidden input to its mount value and re-mounts
  // this form via the route's loading boundary — clobbering the just-saved
  // state with a still-stale server prop. Invoking the action imperatively
  // avoids that reset/refresh entirely.
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      setState(formError('User not found'));
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      acceptsMarketing: acceptsMarketing ? ('true' as const) : ('false' as const),
      email: String(formData.get('email') ?? ''),
      firstName: String(formData.get('firstName') ?? ''),
      lastName: String(formData.get('lastName') ?? ''),
      phone: String(formData.get('phone') ?? ''),
    };

    startTransition(async () => {
      const result = await updateUserAction(payload);
      setState(result);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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

          {/* Plain div, not a native <label>: the Radix Checkbox is a <button>,
              so a wrapping label would forward a second activation click and
              toggle twice. The text span toggles explicitly; the name stays
              associated via aria-labelledby. */}
          <div className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 font-normal transition-colors hover:bg-muted/50">
            <Checkbox
              checked={acceptsMarketing}
              onCheckedChange={(checked) => {
                setAcceptsMarketing(checked === true);
              }}
              id="acceptsMarketing"
              disabled={isPending}
              className="mt-0.5"
              aria-labelledby="acceptsMarketing-title"
              aria-describedby="acceptsMarketing-hint"
            />
            <span
              className="space-y-0.5"
              onClick={() => {
                if (!isPending) {
                  setAcceptsMarketing((previous) => !previous);
                }
              }}
            >
              <span className="block text-body-sm font-medium" id="acceptsMarketing-title">
                Email me about news and offers
              </span>
              <span className="block text-body-sm text-secondary" id="acceptsMarketing-hint">
                Receive updates about new arrivals, sales, and exclusive offers.
              </span>
            </span>
          </div>
        </>
      )}

      <div className="flex justify-end border-t border-border pt-6">
        <Button type="submit" loading={isPending}>
          Save changes
        </Button>
      </div>
    </form>
  );
};

export default UpdateUserForm;
