import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import CardHeaderPattern from '@/components/CardHeaderPattern';
import EmptyState from '@/components/EmptyState';
import PageInfoPagination from '@/components/PageInfoPagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import config from '@/config';
import seo from '@/data/seo';
import { getShopifyToken } from '@/lib/server/shopify-helpers';
import { adjustPaginationVariables } from '@/shopify/helpers';
import { storefrontSdk } from '@/shopify/index';
import { LanguageCode, OrderSortKeys } from '@/shopify/storefront';

import BackButton from '../_components/BackButton';
import Orders from '../_components/Orders';

export const metadata: Metadata = {
  description: seo.account.orders.description,
  title: seo.account.orders.title,
};

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ after?: string; before?: string; sort_key?: string }>;
}) => {
  const searchParameters = await searchParams;

  const shopifyToken = await getShopifyToken();

  if (!shopifyToken) {
    redirect(config.routes.login);
  }

  const response = await storefrontSdk('private').getCustomerOrders({
    customerAccessToken: shopifyToken,
    first: 5,
    ...adjustPaginationVariables({
      after: searchParameters.after || undefined,
      before: searchParameters.before || undefined,
      first: 5,
      last: undefined,
    }),
    identifiers: [],
    language: LanguageCode.En,
    sortKey: OrderSortKeys.ProcessedAt,
  });

  if (response?.customer?.orders === undefined) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState
            variant="orders"
            title="No orders yet"
            subtitle="When you place an order, it will appear here. Start shopping to see your order history."
            altText="Order List is Empty"
            primaryAction={
              <Button variant="default" asChild>
                <Link href="/">Start Shopping</Link>
              </Button>
            }
            secondaryAction={
              <Link href="/collections" className="link">
                Browse collections
              </Link>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const { edges, pageInfo } = response.customer.orders || {};

  if (!edges?.length) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState
            variant="orders"
            title="No orders found"
            subtitle="When you place an order, it will appear here. Start shopping to see your order history."
            altText="No Orders Found"
            primaryAction={
              <Button variant="default" asChild>
                <Link href="/">Start Shopping</Link>
              </Button>
            }
            secondaryAction={
              <Link href="/collections" className="link">
                Browse collections
              </Link>
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
        title={`Your Orders (${response.customer?.orders?.totalCount})`}
        size={3}
        actions={<BackButton />}
        description="View and manage your order history."
      />
      <CardContent>
        <Orders orders={response.customer} />
        <PageInfoPagination
          pageInfo={pageInfo}
          searchParameters={searchParameters}
          basePath={config.routes.orders}
        />
      </CardContent>
    </Card>
  );
};

export default Page;
