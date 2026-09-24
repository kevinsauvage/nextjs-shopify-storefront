'use client';

import { useActionState } from 'react';
import Link from 'next/link';

import { deleteAddressAction, setDefaultAddressAction } from '@/actions/addressesActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import config from '@/config';
import { useFormToast } from '@/hooks/useFormToast';
import type { MailingAddress } from '@/shopify/storefront';
import { emptyFormState, type FormState } from '@/types/formActions';
import { formError } from '@/utils/form-actions';

import { Edit, Heart, MapPin, MoreVerticalIcon, Trash2 } from 'lucide-react';

const Address = ({
  address,
  isDefault,
  displayButton = true,
}: {
  address: MailingAddress;
  isDefault?: boolean;
  displayButton?: boolean;
}) => {
  const { id, address1, address2, name, city, country, province, zip, company, phone } =
    address || {};

  const cityLine = [city, province, zip].filter(Boolean).join(', ');

  // Form-action adapters (same pattern as `AddressForm`): the server actions
  // take a typed id, so the hidden input is extracted here. On success the
  // actions `redirect()`, which Next.js handles natively for form submissions —
  // no `NEXT_REDIRECT` rejection ever reaches user code. Failures surface
  // through the returned state and toast via `useFormToast`.
  const runDeleteAddress = async (
    _previousState: FormState,
    formData: FormData,
  ): Promise<FormState> => {
    const addressId = formData.get('addressId');
    if (typeof addressId !== 'string' || !addressId) {
      return formError('Address ID is missing');
    }

    return deleteAddressAction(addressId);
  };

  const runSetDefaultAddress = async (
    _previousState: FormState,
    formData: FormData,
  ): Promise<FormState> => {
    const addressId = formData.get('addressId');
    if (typeof addressId !== 'string' || !addressId) {
      return formError('Address ID is missing');
    }

    return setDefaultAddressAction(addressId);
  };

  const [deleteState, deleteAction, isDeletePending] = useActionState(
    runDeleteAddress,
    emptyFormState,
  );
  const [defaultState, defaultAction, isDefaultPending] = useActionState(
    runSetDefaultAddress,
    emptyFormState,
  );

  useFormToast(deleteState);
  useFormToast(defaultState);

  return (
    <Card className="py-0 transition-all duration-200 hover:shadow-md">
      <CardContent className="flex items-start justify-between gap-4 p-4 md:p-5">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-secondary">
            <MapPin size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-body font-semibold">{name}</p>
              {isDefault && (
                <Badge variant="default" className="text-caption-sm">
                  Default
                </Badge>
              )}
            </div>
            <address className="space-y-0.5 text-body-sm not-italic text-secondary">
              <p>
                {address1}
                {address2 && `, ${address2}`}
              </p>
              {cityLine && <p>{cityLine}</p>}
              {country && <p>{country}</p>}
            </address>
            {(company || phone) && (
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 pt-1 text-body-sm text-secondary">
                {company && (
                  <span>
                    <span className="font-medium text-foreground">Company:</span> {company}
                  </span>
                )}
                {phone && (
                  <span>
                    <span className="font-medium text-foreground">Phone:</span> {phone}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {displayButton && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="shrink-0 text-secondary hover:bg-muted data-[state=open]:bg-muted"
                size="icon"
                aria-label="Address actions"
              >
                <MoreVerticalIcon size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link
                  href={`${config.routes.editAddress}?id=${id}`}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Edit size={16} />
                  <span>Edit address</span>
                </Link>
              </DropdownMenuItem>
              {!isDefault && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  disabled={isDefaultPending}
                  // The inner submit button drives the form; keep the menu open
                  // so the pending state stays visible instead of fighting it.
                  onSelect={(event) => event.preventDefault()}
                >
                  <form action={defaultAction} className="flex items-center gap-2">
                    <input type="hidden" name="addressId" value={id ?? ''} />
                    <button
                      type="submit"
                      disabled={isDefaultPending}
                      className="flex cursor-pointer items-center gap-2 disabled:cursor-wait disabled:opacity-60"
                    >
                      <Heart size={16} />
                      <span>{isDefaultPending ? 'Setting default…' : 'Set as default'}</span>
                    </button>
                  </form>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                disabled={isDeletePending}
                onSelect={(event) => event.preventDefault()}
              >
                <form action={deleteAction} className="flex items-center gap-2">
                  <input type="hidden" name="addressId" value={id ?? ''} />
                  <button
                    type="submit"
                    disabled={isDeletePending}
                    className="flex cursor-pointer items-center gap-2 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Trash2 size={16} />
                    <span className="whitespace-nowrap">
                      {isDeletePending ? 'Removing…' : 'Remove address'}
                    </span>
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardContent>
    </Card>
  );
};

export default Address;
