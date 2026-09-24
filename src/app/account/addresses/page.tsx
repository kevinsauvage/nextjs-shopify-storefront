import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import NoAddressIllustration from '@/assets/NoAddressIllustration.png';
import CardHeaderPattern from '@/components/CardHeaderPattern';
import EmptyState from '@/components/EmptyState';
import PageInfoPagination from '@/components/PageInfoPagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import config from '@/config/index';
import seo from '@/data/seo';
import { getShopifyToken } from '@/lib/server/shopify-helpers';
import { adjustPaginationVariables } from '@/shopify/helpers';
import { storefrontSdk } from '@/shopify/index';
import type { MailingAddress } from '@/shopify/storefront';
import { getUser } from '@/utils/users';

import BackButton from '../_components/BackButton';

import Address from './_components/Address';

import { Plus } from 'lucide-react';

export const metadata: Metadata = {
  description: seo.account.addresses.description,
  title: seo.account.addresses.title,
};

const Addresses = async ({
  searchParams,
}: {
  searchParams: Promise<{ after?: string; before?: string; sort_key?: string }>;
}) => {
  const searchParameters = await searchParams;
  const customerAccessToken = await getShopifyToken();

  if (!customerAccessToken) {
    redirect(config.routes.login);
  }

  const response = await storefrontSdk('private').getCustomerAddresses({
    ...adjustPaginationVariables({
      after: searchParameters.after || undefined,
      before: searchParameters.before || undefined,
      first: 6,
    }),
    customerAccessToken,
  });

  const addresses =
    response?.customer?.addresses?.edges?.map((edge) => ({
      ...edge.node,
    })) || [];

  const pageInfo = response?.customer?.addresses.pageInfo;
  const user = await getUser();

  const isDefault = (address: MailingAddress) =>
    address.id?.split('?')?.[0] === user?.defaultAddress?.id?.split('?')?.[0];

  const hasAddresses = Array.isArray(addresses) && addresses.length > 0;

  if (!hasAddresses) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState
            variant="addresses"
            image={NoAddressIllustration}
            title="No addresses saved"
            subtitle="Add shipping addresses to speed up checkout. You can save multiple addresses and set a default for faster ordering."
            altText="No Address Yet"
            primaryAction={
              <Button variant="default" asChild>
                <Link href={config.routes.createAddress}>
                  <Plus size={16} />
                  Add new address
                </Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  // A missing `pageInfo` means the customer payload did not come back (e.g.
  // revoked token mid-render): show an error instead of a blank page.
  if (!pageInfo) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState
            variant="addresses"
            image={NoAddressIllustration}
            title="We couldn't load your addresses"
            subtitle="Please try again in a moment. If the problem persists, contact support."
            altText="Addresses unavailable"
            primaryAction={
              <Button variant="default" asChild>
                <Link href={config.routes.account}>Back to account</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeaderPattern
        as="h2"
        title="Addresses"
        size={3}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <BackButton />
            <Button variant="default" asChild>
              <Link href={config.routes.createAddress} className="gap-2">
                <Plus size={16} />
                Add new address
              </Link>
            </Button>
          </div>
        }
        description="Manage your shipping addresses for faster checkout."
      />
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {addresses.map((item) => (
            <Address key={item.id} address={item} isDefault={isDefault(item)} />
          ))}
        </div>
        <PageInfoPagination
          pageInfo={pageInfo}
          searchParameters={searchParameters}
          basePath={config.routes.addresses}
        />
      </CardContent>
    </Card>
  );
};

export default Addresses;
