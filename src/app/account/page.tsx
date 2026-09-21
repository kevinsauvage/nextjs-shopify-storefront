import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import AccountStats from '@/app/account/_components/AccountStats';
import CardHeaderPattern from '@/components/CardHeaderPattern';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import config from '@/config';
import seo from '@/data/seo';
import { getShopifyToken } from '@/lib/server/shopify-helpers';
import { WishlistService } from '@/services/wishlist.service';
import { storefrontSdk } from '@/shopify/index';
import { LanguageCode, OrderSortKeys } from '@/shopify/storefront';
import { getUser } from '@/utils/users';

import RecentOrdersPreview from './_components/RecentOrdersPreview';
import UserFullName from './_components/UserFullName';

export const dynamic = 'force-dynamic'; // Account data is user-specific

export const metadata: Metadata = {
  description: seo.account.description,
  title: seo.account.title,
};

const AccountCardCTA = ({
  title,
  description,
  buttonText,
  buttonLink,
  icon,
}: {
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  icon?: React.ReactNode;
}) => {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4 md:p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            {icon && <div className="text-secondary">{icon}</div>}
            <h3 className="text-heading-4">{title}</h3>
            <p className="text-body-sm text-secondary">{description}</p>
          </div>
          <Button variant="secondary" size="sm" asChild className="w-full sm:w-auto">
            <Link href={buttonLink} scroll>
              {buttonText}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const Page = async () => {
  const shopifyToken = await getShopifyToken();
  const user = await getUser();

  if (!shopifyToken || !user) {
    redirect(config.routes.login);
  }

  // Fetch stats in parallel
  const [ordersResponse, addressesResponse, wishlist] = await Promise.all([
    storefrontSdk('private').getCustomerOrders({
      customerAccessToken: shopifyToken,
      first: 1,
      identifiers: [],
      language: LanguageCode.En,
      sortKey: OrderSortKeys.ProcessedAt,
    }),
    storefrontSdk('private').getCustomerAddresses({
      customerAccessToken: shopifyToken,
      first: 1,
    }),
    WishlistService.getWishlist(),
  ]);

  const ordersCount = Number(ordersResponse?.customer?.orders?.totalCount || 0);
  const addressesCount = addressesResponse?.customer?.addresses?.edges?.length || 0;
  const wishlistCount = wishlist?.length || 0;

  // Fetch recent orders for preview
  const recentOrdersResponse = await storefrontSdk('private').getCustomerOrders({
    customerAccessToken: shopifyToken,
    first: 3,
    identifiers: [],
    language: LanguageCode.En,
    sortKey: OrderSortKeys.ProcessedAt,
  });

  const recentOrders = recentOrdersResponse?.customer?.orders?.edges || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeaderPattern
          className="w-full"
          title="Account Overview"
          size={3}
          description={
            <>
              Welcome <UserFullName user={user} />, your account dashboard provides access to all of your
              important account information and features.
            </>
          }
        />
        <CardContent className="space-y-6">
          <AccountStats
            ordersCount={ordersCount}
            addressesCount={addressesCount}
            wishlistCount={wishlistCount}
            memberSince={user.createdAt}
          />

          {recentOrders.length > 0 && (
            <div className="pt-4 border-t">
              <RecentOrdersPreview orders={recentOrders} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 justify-items-stretch pt-4">
            <AccountCardCTA
              title="Personal Information"
              description="Update your personal details and preferences"
              buttonText="Edit Details"
              buttonLink={config.routes.updateAccount}
            />
            <AccountCardCTA
              title="Addresses"
              description="Manage your shipping and billing addresses"
              buttonText="Edit Addresses"
              buttonLink={config.routes.addresses}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Page;
