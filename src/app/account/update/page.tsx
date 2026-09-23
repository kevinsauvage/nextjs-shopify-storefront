import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import AccountStats from '@/app/account/_components/AccountStats';
import CardHeaderPattern from '@/components/CardHeaderPattern';
import { Card, CardContent } from '@/components/ui/card';
import config from '@/config';
import seo from '@/data/seo';
import { getAccountStats } from '@/lib/server/account';
import { getShopifyToken } from '@/lib/server/shopify-helpers';
import { getUser } from '@/utils/users';

import BackButton from '../_components/BackButton';

import UpdateUserForm from './_components/UpdateUserForm';

export const metadata: Metadata = {
  description: seo.account.update.description,
  title: seo.account.update.title,
};

const Page = async () => {
  const shopifyToken = await getShopifyToken();
  const user = await getUser();

  if (!user) {
    redirect(config.routes.login);
  }

  const stats = shopifyToken
    ? await getAccountStats(shopifyToken)
    : { addressesCount: 0, ordersCount: 0, recentOrders: [] };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeaderPattern
          as="h2"
          title="Update account"
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
            as="h2"
            title="Account statistics"
            size={4}
            description="Overview of your account activity"
          />
          <CardContent>
            <AccountStats
              ordersCount={stats.ordersCount}
              addressesCount={stats.addressesCount}
              memberSince={user.createdAt}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Page;
