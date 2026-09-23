'use server';

import { redirect } from 'next/navigation';

import config from '@/config';
import { AddressService } from '@/services/address.service';
import type { FormState } from '@/types/formActions';
import { safeLogError } from '@/utils/api-responses';
import { formError, serviceErrorsToFormState, zodErrorsToFormState } from '@/utils/form-actions';

import { z } from 'zod';

const addressSchema = z.object({
  address1: z.string().min(1, 'Address is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  company: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  firstName: z.string().min(1, 'First name is required'),
  id: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  province: z.string().optional(),
  zip: z.string().min(1, 'Zip is required'),
});

type AddressInput = z.infer<typeof addressSchema>;

export async function createAddressAction(input: AddressInput): Promise<FormState> {
  const result = addressSchema.safeParse(input);
  if (!result.success) {
    return zodErrorsToFormState(result.error);
  }

  let serviceResult;
  try {
    serviceResult = await AddressService.createAddress(result.data);
  } catch (error) {
    safeLogError('createAddressAction', error);
    return formError('Failed to create address');
  }

  const errorState = serviceErrorsToFormState(serviceResult);
  if (errorState) return errorState;

  redirect(config.routes.addresses);
}

export async function deleteAddressAction(addressId: string): Promise<FormState> {
  let serviceResult;
  try {
    serviceResult = await AddressService.deleteAddress(addressId);
  } catch (error) {
    safeLogError('deleteAddressAction', error);
    return formError('Failed to delete address');
  }

  const errorState = serviceErrorsToFormState(serviceResult);
  if (errorState) return errorState;

  redirect(config.routes.addresses);
}

export async function setDefaultAddressAction(addressId: string): Promise<FormState> {
  let serviceResult;
  try {
    serviceResult = await AddressService.setDefaultAddress(addressId);
  } catch (error) {
    safeLogError('setDefaultAddressAction', error);
    return formError('Failed to set default address');
  }

  const errorState = serviceErrorsToFormState(serviceResult);
  if (errorState) return errorState;

  redirect(config.routes.addresses);
}

export async function updateAddressAction(input: AddressInput): Promise<FormState> {
  const result = addressSchema.safeParse(input);
  if (!result.success) {
    return zodErrorsToFormState(result.error);
  }

  let serviceResult;
  try {
    serviceResult = await AddressService.updateAddress(result.data);
  } catch (error) {
    safeLogError('updateAddressAction', error);
    return formError('Failed to update address');
  }

  const errorState = serviceErrorsToFormState(serviceResult);
  if (errorState) return errorState;

  redirect(config.routes.addresses);
}
