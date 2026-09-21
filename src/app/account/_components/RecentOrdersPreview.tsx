import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import config from '@/config';
import type { GetCustomerOrdersQuery } from '@/shopify/storefront';
import { formatDate, formatPrice } from '@/utils/format';

import { ArrowRight, Package } from 'lucide-react';

type RecentOrdersPreviewProps = {
  orders: NonNullable<GetCustomerOrdersQuery['customer']>['orders']['edges'];
};

const RecentOrdersPreview = ({ orders }: RecentOrdersPreviewProps) => {
  if (!orders || orders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={20} className="text-secondary" />
          <h3 className="text-heading-4">Recent Orders</h3>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={config.routes.orders}>
            View all
            <ArrowRight size={16} className="ml-1" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {orders.slice(0, 3).map((order) => {
          const { node } = order;
          const orderTotal = node.totalPrice;
          const orderDate = node.processedAt;

          return (
            <Link key={node.id} href={config.routes.orders}>
              <Card className="transition-all hover:shadow-md hover:border-primary/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-body font-medium">Order {node.name}</p>
                      </div>
                      <p className="text-body-sm text-secondary">
                        {formatDate(orderDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    {orderTotal && (
                      <div className="text-right">
                        <p className="text-body font-semibold">
                          {formatPrice(orderTotal.amount, orderTotal.currencyCode)}
                        </p>
                      </div>
                    )}
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
