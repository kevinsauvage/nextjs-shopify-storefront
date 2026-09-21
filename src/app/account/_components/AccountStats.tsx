'use client';

import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import config from '@/config';
import useUserContext from '@/contexts/UserContext/useUserContext';
import { cn } from '@/utils/cn';

import { Calendar, Heart, MapPin, Package } from 'lucide-react';

type StatCardProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  href?: string;
  description?: string;
  className?: string;
};

const StatCard = ({ title, value, icon, href, description, className }: StatCardProps) => {
  const content = (
    <Card className={cn('transition-all hover:shadow-md h-full', className)}>
      <CardContent className="p-4 md:p-6 h-full flex flex-col">
        <div className="flex items-start justify-between gap-3 md:gap-4 flex-1 min-w-0">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-body-sm text-secondary truncate">{title}</p>
            <p className="text-heading-3 font-semibold">{value}</p>
            {description && (
              <p className="text-caption-sm text-secondary mt-1 line-clamp-2">{description}</p>
            )}
          </div>
          <div className="text-secondary shrink-0">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
};

type AccountStatsProps = {
  ordersCount?: number;
  addressesCount?: number;
  memberSince?: string;
  className?: string;
};

const AccountStats = ({
  ordersCount = 0,
  addressesCount = 0,
  memberSince,
  className,
}: AccountStatsProps) => {
  // The wishlist lives in localStorage-backed client state, so read it from the
  // context rather than fetching it again on the server.
  const { wishlistIds } = useUserContext();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div
      className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr', className)}
    >
      <StatCard
        title="Total Orders"
        value={ordersCount}
        icon={<Package size={24} className="shrink-0" />}
        href={config.routes.orders}
        description="View order history"
      />
      <StatCard
        title="Saved Addresses"
        value={addressesCount}
        icon={<MapPin size={24} className="shrink-0" />}
        href={config.routes.addresses}
        description="Manage addresses"
      />
      <StatCard
        title="Wishlist Items"
        value={wishlistIds.length}
        icon={<Heart size={24} className="shrink-0" />}
        href={config.routes.wishlist}
        description="View saved items"
      />
      <StatCard
        title="Member Since"
        value={formatDate(memberSince)}
        icon={<Calendar size={24} className="shrink-0" />}
        description="Account created"
      />
    </div>
  );
};

export default AccountStats;
