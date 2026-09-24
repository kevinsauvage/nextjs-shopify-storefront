'use server';

import { redirect } from 'next/navigation';

import config from '@/config';
import { reportError } from '@/lib/logger';
import { fingerprintForRateLimit, getClientIp, rateLimitKey } from '@/lib/server/client-ip';
import { isRateLimited } from '@/lib/server/rate-limit';
import { getShopifyToken } from '@/lib/server/shopify-helpers';
import { AddressService } from '@/services/address.service';
import type { FormState } from '@/types/formActions';
import { formError, serviceErrorsToFormState, zodErrorsToFormState } from '@/utils/form-actions';
import { companyField, phoneField, shopifyGidField } from '@/utils/validation';

import { z } from 'zod';

const addressSchema = z.object({
  address1: z.string().trim().min(1, 'Address is required').max(255),
  address2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(1, 'City is required').max(100),
  company: companyField,
  country: z.string().trim().min(1, 'Country is required').max(100),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  id: z.string().optional(),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  phone: phoneField,
  province: z.string().trim().max(100).optional(),
  zip: z.string().trim().min(1, 'Zip is required').max(20),
});

type AddressInput = z.infer<typeof addressSchema>;

/**
 * Throttle address writes (each is a Shopify Admin mutation). Fail closed, and
 * key by IP plus the fingerprinted session token so off-Vercel `unknown`-IP
 * traffic does not share one global bucket. Returns an error state when
 * limited, `null` when the caller may proceed.
 */
const assertNotRateLimited = async (): Promise<FormState | null> => {
  const [ip, token] = await Promise.all([getClientIp(), getShopifyToken()]);
  const limited = await isRateLimited(
    'address:write',
    rateLimitKey(ip, token ? fingerprintForRateLimit(token) : null),
    30,
    '1 m',
    { failClosed: true },
  );

  return limited ? formError('Too many address updates. Please try again later.') : null;
};

export async function createAddressAction(input: AddressInput): Promise<FormState> {
  const result = addressSchema.safeParse(input);
  if (!result.success) {
    return zodErrorsToFormState(result.error);
  }

  const limited = await assertNotRateLimited();
  if (limited) return limited;

  let serviceResult;
  try {
    serviceResult = await AddressService.createAddress(result.data);
  } catch (error) {
    reportError('createAddressAction', error);
    return formError('Failed to create address');
  }

  const errorState = serviceErrorsToFormState(serviceResult);
  if (errorState) return errorState;

  redirect(config.routes.addresses);
}

export async function deleteAddressAction(addressId: string): Promise<FormState> {
  if (!shopifyGidField.safeParse(addressId).success) {
    return formError('Invalid address');
  }

  const limited = await assertNotRateLimited();
  if (limited) return limited;

  let serviceResult;
  try {
    serviceResult = await AddressService.deleteAddress(addressId);
  } catch (error) {
    reportError('deleteAddressAction', error);
    return formError('Failed to delete address');
  }

  const errorState = serviceErrorsToFormState(serviceResult);
  if (errorState) return errorState;

  redirect(config.routes.addresses);
}

export async function setDefaultAddressAction(addressId: string): Promise<FormState> {
  if (!shopifyGidField.safeParse(addressId).success) {
    return formError('Invalid address');
  }

  const limited = await assertNotRateLimited();
  if (limited) return limited;

  let serviceResult;
  try {
    serviceResult = await AddressService.setDefaultAddress(addressId);
  } catch (error) {
    reportError('setDefaultAddressAction', error);
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

  const limited = await assertNotRateLimited();
  if (limited) return limited;

  let serviceResult;
  try {
    serviceResult = await AddressService.updateAddress(result.data);
  } catch (error) {
    reportError('updateAddressAction', error);
    return formError('Failed to update address');
  }

  const errorState = serviceErrorsToFormState(serviceResult);
  if (errorState) return errorState;

  redirect(config.routes.addresses);
}
