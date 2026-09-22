import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import config from '@/config';
import type { GetCustomerOrdersQuery } from '@/shopify/storefront';
import { formatDate, formatPrice } from '@/utils/format';

import { ArrowRight, ChevronRight, Package } from 'lucide-react';

type RecentOrdersPreviewProps = {
  orders: NonNullable<GetCustomerOrdersQuery['customer']>['orders']['edges'];
};

const RecentOrdersPreview = ({ orders }: RecentOrdersPreviewProps) => {
  if (!orders || orders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-secondary" />
          <h3 className="text-heading-4">Recent orders</h3>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={config.routes.orders}>
            View all
            <ArrowRight size={16} />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {orders.slice(0, 3).map((order) => {
          const { node } = order;
          const orderTotal = node.totalPrice;
          const orderDate = node.processedAt;

          return (
            <Link
              key={node.id}
              href={config.routes.orders}
              className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Card className="py-0 transition-all duration-200 group-hover:border-foreground/20 group-hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-body font-medium">Order {node.name}</p>
                    <p className="text-body-sm text-secondary">
                      {formatDate(orderDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {orderTotal && (
                      <p className="text-body font-semibold tabular-nums">
                        {formatPrice(orderTotal.amount, orderTotal.currencyCode)}
                      </p>
                    )}
                    <ChevronRight
                      size={18}
                      className="text-secondary transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default RecentOrdersPreview;
