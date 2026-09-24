'use client';

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
import { reportError } from '@/lib/logger';
import type { MailingAddress } from '@/shopify/storefront';

import { Edit, Heart, MapPin, MoreVerticalIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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

  const handleDelete = async (): Promise<void> => {
    if (!id) {
      toast.error('Address ID is missing');
      return;
    }

    const response = await deleteAddressAction(id);

    if (response && !response.ok) {
      toast.error(response.message || 'Failed to delete address');
      return;
    }
    toast.success('Address deleted successfully');
  };

  const handleSetAsDefault = async (): Promise<void> => {
    if (!id) {
      toast.error('Address ID is missing');
      return;
    }

    const response = await setDefaultAddressAction(id);

    if (response && !response.ok) {
      toast.error(response.message || 'Failed to set default address');
      return;
    }
    toast.success('Address set as default successfully');
  };

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
                  onClick={() => {
                    handleSetAsDefault().catch((error) => {
                      reportError('account/address', error);
                    });
                  }}
                >
                  <Heart size={16} />
                  <span>Set as default</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => {
                  handleDelete().catch((error) => {
                    reportError('account/address', error);
                  });
                }}
              >
                <Trash2 size={16} />
                <span className="whitespace-nowrap">Remove address</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardContent>
    </Card>
  );
};

export default Address;
