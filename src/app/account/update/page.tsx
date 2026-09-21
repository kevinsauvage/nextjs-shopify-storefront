import type { Metadata } from 'next';

import AccountStats from '@/app/account/_components/AccountStats';
import CardHeaderPattern from '@/components/CardHeaderPattern';
import { Card, CardContent } from '@/components/ui/card';
import seo from '@/data/seo';
import { getShopifyToken } from '@/lib/server/shopify-helpers';
import { WishlistService } from '@/services/wishlist.service';
import { storefrontSdk } from '@/shopify/index';
import { LanguageCode, OrderSortKeys } from '@/shopify/storefront';
import { getUser } from '@/utils/users';

import BackButton from '../_components/BackButton';

import UpdateUserForm from './_components/UpdateUserForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description: seo.account.update.description,
  title: seo.account.update.title,
};

const Page = async () => {
  const shopifyToken = await getShopifyToken();
  const user = await getUser();

  // Fetch stats in parallel
  const [ordersResponse, addressesResponse, wishlist] = await Promise.all([
    shopifyToken
      ? storefrontSdk('private').getCustomerOrders({
          customerAccessToken: shopifyToken,
          first: 1,
          identifiers: [],
          language: LanguageCode.En,
          sortKey: OrderSortKeys.ProcessedAt,
        })
      : Promise.resolve(null),
    shopifyToken
      ? storefrontSdk('private').getCustomerAddresses({
          customerAccessToken: shopifyToken,
          first: 1,
        })
      : Promise.resolve(null),
    WishlistService.getWishlist(),
  ]);

  const ordersCount = Number(ordersResponse?.customer?.orders?.totalCount || 0);
  const addressesCount = addressesResponse?.customer?.addresses?.edges?.length || 0;
  const wishlistCount = wishlist?.length || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeaderPattern
          title="Update Account"
          size={3}
          actions={<BackButton />}
          description="Update your account information and preferences."
        />
        <CardContent className="space-y-6">
          <UpdateUserForm user={user} />
        </CardContent>
      </Card>

      {user && (
        <Card>
          <CardHeaderPattern
            title="Account Statistics"
            size={4}
            description="Overview of your account activity"
          />
          <CardContent>
            <AccountStats
              ordersCount={ordersCount}
              addressesCount={addressesCount}
              wishlistCount={wishlistCount}
              memberSince={user.createdAt}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Page;
