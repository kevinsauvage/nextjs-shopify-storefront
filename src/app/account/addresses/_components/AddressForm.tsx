'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import FormFieldError from '@/components/FormFieldError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFormToast } from '@/hooks/useFormToast';
import { emptyFormState, type FormState } from '@/types/formActions';

const SubmitButton = ({ buttonText }: { buttonText: string }) => {
  const status = useFormStatus();
  return (
    <Button type="submit" loading={status.pending} className="w-full md:w-auto">
      {buttonText}
    </Button>
  );
};

type AddressAction = (input: {
  address1: string;
  address2?: string;
  city: string;
  company?: string;
  country: string;
  firstName: string;
  id?: string;
  lastName: string;
  phone?: string;
  province?: string;
  zip: string;
}) => Promise<FormState>;

const AddressFormUI = ({
  action,
  address,
  buttonText = 'Add address',
}: {
  action: AddressAction;
  address?: {
    address1?: string;
    address2?: string;
    city?: string;
    company?: string;
    country?: string;
    firstName?: string;
    id?: string;
    lastName?: string;
    phone?: string;
    province?: string;
    zip?: string;
  };

  buttonText: string;
}) => {
  // Wrapper function to extract FormData and call typed server action
  const handleSubmit = async (_previousState: unknown, formData: FormData) => {
    const address1 = formData.get('address1') as string;
    const address2 = formData.get('address2') as string;
    const city = formData.get('city') as string;
    const company = formData.get('company') as string;
    const country = formData.get('country') as string;
    const firstName = formData.get('firstName') as string;
    const id = formData.get('id') as string;
    const lastName = formData.get('lastName') as string;
    const phone = formData.get('phone') as string;
    const province = formData.get('province') as string;
    const zip = formData.get('zip') as string;

    return action({
      address1,
      address2: address2 || undefined,
      city,
      company: company || undefined,
      country,
      firstName,
      id: id || undefined,
      lastName,
      phone: phone || undefined,
      province: province || undefined,
      zip,
    });
  };

  const [state, actionState, isPending] = useActionState<FormState, FormData>(
    handleSubmit,
    emptyFormState,
  );

  useFormToast(state);

  return (
    <form action={actionState} className="space-y-8">
      {address?.id && <input type="hidden" name="id" value={address?.id} />}

      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-heading-4">Contact details</h3>
          <p className="text-body-sm text-secondary">Who should we contact about this address?</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              name="firstName"
              placeholder="First name"
              required={true}
              type="text"
              defaultValue={address?.firstName}
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
              name="lastName"
              placeholder="Last name"
              required={true}
              type="text"
              defaultValue={address?.lastName}
              disabled={isPending}
              aria-invalid={!!state.errors?.lastName?.length}
              aria-describedby={state.errors?.lastName?.length ? 'lastName-error' : undefined}
            />
            <FormFieldError error={state.errors?.lastName} fieldId="lastName" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              name="company"
              placeholder="Company (optional)"
              type="text"
              defaultValue={address?.company}
              disabled={isPending}
              aria-invalid={!!state.errors?.company?.length}
              aria-describedby={state.errors?.company?.length ? 'company-error' : undefined}
            />
            <FormFieldError error={state.errors?.company} fieldId="company" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              placeholder="Phone"
              type="text"
              defaultValue={address?.phone}
              disabled={isPending}
              aria-invalid={!!state.errors?.phone?.length}
              aria-describedby={state.errors?.phone?.length ? 'phone-error' : undefined}
            />
            <FormFieldError error={state.errors?.phone} fieldId="phone" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-heading-4">Shipping address</h3>
          <p className="text-body-sm text-secondary">Where should we deliver your orders?</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="w-full space-y-2">
            <Label htmlFor="address1">Address line 1</Label>
            <Input
              id="address1"
              name="address1"
              placeholder="Street address"
              required={true}
              type="text"
              defaultValue={address?.address1}
              disabled={isPending}
              aria-invalid={!!state.errors?.address1?.length}
              aria-describedby={state.errors?.address1?.length ? 'address1-error' : undefined}
            />
            <FormFieldError error={state.errors?.address1} fieldId="address1" />
          </div>
          <div className="w-full space-y-2">
            <Label htmlFor="address2">Address line 2</Label>
            <Input
              id="address2"
              name="address2"
              placeholder="Apartment, suite, etc. (optional)"
              type="text"
              defaultValue={address?.address2}
              disabled={isPending}
              aria-invalid={!!state.errors?.address2?.length}
              aria-describedby={state.errors?.address2?.length ? 'address2-error' : undefined}
            />
            <FormFieldError error={state.errors?.address2} fieldId="address2" />
          </div>

          <div className="w-full space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              name="city"
              placeholder="City"
              required={true}
              type="text"
              defaultValue={address?.city}
              disabled={isPending}
              aria-invalid={!!state.errors?.city?.length}
              aria-describedby={state.errors?.city?.length ? 'city-error' : undefined}
            />
            <FormFieldError error={state.errors?.city} fieldId="city" />
          </div>
          <div className="w-full space-y-2">
            <Label htmlFor="province">Province / State</Label>
            <Input
              id="province"
              name="province"
              placeholder="Province"
              required={true}
              type="text"
              defaultValue={address?.province}
              disabled={isPending}
              aria-invalid={!!state.errors?.province?.length}
              aria-describedby={state.errors?.province?.length ? 'province-error' : undefined}
            />
            <FormFieldError error={state.errors?.province} fieldId="province" />
          </div>

          <div className="w-full space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              name="country"
              placeholder="Country"
              required={true}
              type="text"
              defaultValue={address?.country}
              disabled={isPending}
              aria-invalid={!!state.errors?.country?.length}
              aria-describedby={state.errors?.country?.length ? 'country-error' : undefined}
            />
            <FormFieldError error={state.errors?.country} fieldId="country" />
          </div>
          <div className="w-full space-y-2">
            <Label htmlFor="zip">Postal / Zip code</Label>
            <Input
              id="zip"
              name="zip"
              placeholder="Zip"
              required={true}
              type="text"
              defaultValue={address?.zip}
              disabled={isPending}
              aria-invalid={!!state.errors?.zip?.length}
              aria-describedby={state.errors?.zip?.length ? 'zip-error' : undefined}
            />
            <FormFieldError error={state.errors?.zip} fieldId="zip" />
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-border pt-6">
        <SubmitButton buttonText={buttonText} />
      </div>
    </form>
  );
};

export default AddressFormUI;
