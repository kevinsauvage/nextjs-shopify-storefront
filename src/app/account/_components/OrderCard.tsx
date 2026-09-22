'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import config from '@/config';
import { DEFAULTS } from '@/config/constants';
import type {
  OrderFieldsFragment,
  OrderFinancialStatus,
  OrderFulfillmentStatus,
} from '@/shopify/storefront';
import { cn } from '@/utils/cn';
import { formatDate, formatPrice } from '@/utils/format';

import { ChevronDown, Package } from 'lucide-react';

function formatStatus(status?: OrderFulfillmentStatus | OrderFinancialStatus | null) {
  return status
    ? status
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase())
    : DEFAULTS.na;
}

const getStatusBadgeVariant = (
  status?: OrderFulfillmentStatus | OrderFinancialStatus | null,
): 'default' | 'secondary' | 'outline' => {
  if (!status) return 'outline';

  const statusLower = status.toLowerCase();

  if (statusLower.includes('fulfilled') || statusLower.includes('paid')) {
    return 'default';
  }

  if (statusLower.includes('pending') || statusLower.includes('unfulfilled')) {
    return 'secondary';
  }

  return 'outline';
};

const Detail = ({ label, value }: { label: string; value: string | number | null }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-border/70 py-2">
    <dt className="whitespace-nowrap text-body-sm text-secondary">{label}</dt>
    <dd className="text-right text-body-sm font-medium">{value}</dd>
  </div>
);

const OrderCard = ({ order }: { order: OrderFieldsFragment }) => {
  const {
    financialStatus,
    email,
    cancelReason,
    phone,
    fulfillmentStatus,
    totalRefunded,
    totalPrice,
    subtotalPrice,
    successfulFulfillments,
    shippingAddress,
  } = order;

  const [open, setOpen] = useState(false);

  // Get order items from fulfillments
  const orderItems =
    successfulFulfillments
      ?.flatMap((fulfillment) =>
        fulfillment.fulfillmentLineItems?.edges?.map((edge) => edge.node.lineItem),
      )
      .filter(Boolean) || [];

  const itemsCount = orderItems.reduce((sum, item) => sum + (item?.quantity || 0), 0);

  const details: Array<{ label: string; value: string | number | null }> = [];

  if (subtotalPrice) {
    details.push({
      label: 'Subtotal',
      value: formatPrice(subtotalPrice.amount, subtotalPrice.currencyCode),
    });
  }
  if (totalPrice) {
    details.push({
      label: 'Total',
      value: formatPrice(totalPrice.amount, totalPrice.currencyCode),
    });
  }
  if (totalRefunded?.amount && Number(totalRefunded.amount) > 0) {
    details.push({
      label: 'Refunded',
      value: formatPrice(totalRefunded.amount, totalRefunded.currencyCode),
    });
  }

  details.push(
    { label: 'Financial status', value: formatStatus(financialStatus) },
    { label: 'Fulfillment status', value: formatStatus(fulfillmentStatus) },
    { label: 'Email', value: email || DEFAULTS.na },
  );

  if (phone) {
    details.push({ label: 'Phone', value: phone });
  }
  if (typeof order.processedAt === 'string') {
    details.push({ label: 'Processed at', value: formatDate(order.processedAt) });
  }
  if (shippingAddress?.name) {
    details.push({ label: 'Shipping to', value: shippingAddress.formatted.join(', ') });
  }
  if (typeof order.canceledAt === 'string' && typeof cancelReason === 'string') {
    details.push(
      { label: 'Cancel reason', value: cancelReason },
      { label: 'Canceled at', value: formatDate(order.canceledAt) },
    );
  }

  return (
    <li className="list-none">
      <Collapsible open={open} onOpenChange={setOpen}>
        <Card className="w-full py-0 transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between gap-4 p-4 md:p-6">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                aria-expanded={open}
                className="group flex w-full items-center justify-between gap-4 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-heading-4">Order {order.name}</h3>
                    {fulfillmentStatus && (
                      <Badge variant={getStatusBadgeVariant(fulfillmentStatus)}>
                        {formatStatus(fulfillmentStatus)}
                      </Badge>
                    )}
                    {financialStatus && (
                      <Badge variant={getStatusBadgeVariant(financialStatus)}>
                        {formatStatus(financialStatus)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-secondary">
                    {typeof order.processedAt === 'string' && (
                      <span>{formatDate(order.processedAt)}</span>
                    )}
                    {totalPrice && (
                      <span className="font-medium text-foreground tabular-nums">
                        {formatPrice(totalPrice.amount, totalPrice.currencyCode)}
                      </span>
                    )}
                    {itemsCount > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Package size={14} />
                        {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    'size-5 shrink-0 text-secondary transition-transform duration-200 group-hover:text-foreground',
                    open && 'rotate-180',
                  )}
                />
              </button>
            </CollapsibleTrigger>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="space-y-6 px-4 pb-5 md:px-6 md:pb-6">
              {orderItems.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-heading-4">Order items</h4>
                  <div className="divide-y divide-border/70">
                    {orderItems.slice(0, 3).map((item, index) => {
                      if (!item) return null;
                      const product = item.variant?.product;
                      const productHandle = product?.handle;

                      return (
                        <div
                          key={`order-item-${index + 1}`}
                          className="flex items-center justify-between gap-4 py-3 text-body-sm first:pt-0 last:pb-0"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            {item.variant?.image && (
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                                <img
                                  src={item.variant.image.small || item.variant.image.url}
                                  alt={item.variant.image.altText || item.title}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              {productHandle ? (
                                <Link
                                  href={`${config.routes.collection}/products/${productHandle}`}
                                  className="line-clamp-1 font-medium hover:underline"
                                >
                                  {item.title}
                                </Link>
                              ) : (
                                <p className="line-clamp-1 font-medium">{item.title}</p>
                              )}
                              {item.variant?.title && item.variant.title !== 'Default Title' && (
                                <p className="text-caption-sm text-secondary">
                                  {item.variant.title}
                                </p>
                              )}
                              <p className="text-secondary">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          {item.discountedTotalPrice && (
                            <div className="shrink-0 text-body font-medium tabular-nums">
                              {formatPrice(
                                item.discountedTotalPrice.amount,
                                item.discountedTotalPrice.currencyCode,
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {orderItems.length > 3 && (
                    <p className="text-body-sm text-secondary">
                      +{orderItems.length - 3} more {orderItems.length - 3 === 1 ? 'item' : 'items'}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-heading-4">Order details</h4>
                <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                  {details.map((detail) => (
                    <Detail key={detail.label} label={detail.label} value={detail.value} />
                  ))}
                </dl>
              </div>

              {successfulFulfillments && successfulFulfillments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-heading-4">Tracking information</h4>

                  {successfulFulfillments.map((fulfillment, index) => {
                    const { trackingInfo, trackingCompany } = fulfillment;

                    if (!trackingInfo || trackingInfo.length === 0) return null;

                    return (
                      <div
                        key={`${fulfillment.trackingCompany ?? 'carrier'}-${index}`}
                        className="space-y-2"
                      >
                        <div className="flex justify-between border-b border-border/70 py-1">
                          <span className="text-body-sm text-secondary">
                            {trackingCompany || DEFAULTS.carrier}
                            {successfulFulfillments.length > 1 ? ` (${index + 1})` : ''}
                          </span>
                          <span className="text-body-sm font-medium">
                            {trackingInfo.length} items
                          </span>
                        </div>

                        {trackingInfo.map((trackInfo, trackingIndex) => (
                          <div
                            key={trackInfo.number ?? `tracking-${trackingIndex}`}
                            className="flex justify-between border-b border-border/70 py-1"
                          >
                            <span className="text-body-sm text-secondary">
                              {trackInfo.number || DEFAULTS.trackingNumber}
                            </span>
                            {typeof trackInfo.url === 'string' ? (
                              <Link
                                href={trackInfo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-body-sm font-medium link"
                              >
                                Track
                              </Link>
                            ) : (
                              <span className="text-body-sm font-medium text-muted">
                                {DEFAULTS.link}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </li>
  );
};

export default OrderCard;
