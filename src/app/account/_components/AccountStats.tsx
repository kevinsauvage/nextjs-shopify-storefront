'use client';

import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import config from '@/config';
import useUserContext from '@/contexts/UserContext/useUserContext';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/format';

import { ArrowRight, Calendar, Heart, MapPin, Package } from 'lucide-react';

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
    <Card
      className={cn(
        'h-full py-0',
        href &&
          'group transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md',
        className,
      )}
    >
      <CardContent className="flex h-full flex-col p-5">
        <span
          className={cn(
            'flex size-10 items-center justify-center rounded-lg bg-muted text-secondary transition-colors',
            href && 'group-hover:bg-foreground group-hover:text-background',
          )}
        >
          {icon}
        </span>
        <div className="mt-4 flex-1 space-y-1">
          <p className="text-eyebrow">{title}</p>
          <p className="text-heading-3 tabular-nums">{value}</p>
          {description && <p className="text-caption-sm text-secondary">{description}</p>}
        </div>
        {href && (
          <span className="mt-3 inline-flex items-center gap-1 text-caption-sm font-medium text-secondary transition-colors group-hover:text-foreground">
            View
            <ArrowRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </span>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
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

  return (
    <div
      className={cn('grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}
    >
      <StatCard
        title="Total orders"
        value={ordersCount}
        icon={<Package size={20} />}
        href={config.routes.orders}
        description="View order history"
      />
      <StatCard
        title="Saved addresses"
        value={addressesCount}
        icon={<MapPin size={20} />}
        href={config.routes.addresses}
        description="Manage addresses"
      />
      <StatCard
        title="Wishlist items"
        value={wishlistIds.length}
        icon={<Heart size={20} />}
        href={config.routes.wishlist}
        description="View saved items"
      />
      <StatCard
        title="Member since"
        value={formatDate(memberSince, { month: 'short', year: 'numeric' })}
        icon={<Calendar size={20} />}
        description="Account created"
      />
    </div>
  );
};

export default AccountStats;
