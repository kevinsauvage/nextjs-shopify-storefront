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
import { formatDate, formatPrice } from '@/utils/format';

import { ChevronDown, ChevronUp, Package } from 'lucide-react';

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

const Row = ({ label, value }: { label: string; value: string | number | null }) => (
  <div className="flex justify-between gap-4 py-1 border-b border-border last:border-none">
    <span className="text-body-sm text-secondary">{label}</span>
    <span className="text-body-sm font-medium">{value}</span>
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

  return (
    <li className="list-none">
      <Collapsible open={open} onOpenChange={setOpen}>
        <Card className="w-full transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6">
            <CollapsibleTrigger asChild>
              <button className="group flex items-center justify-between gap-4 w-full text-left">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h5 className="text-heading-4">Order {order.name}</h5>
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
                  <div className="flex items-center gap-4 flex-wrap text-body-sm text-secondary">
                    {typeof order.processedAt === 'string' && (
                      <span>{formatDate(order.processedAt)}</span>
                    )}
                    {totalPrice && (
                      <span className="font-medium text-foreground">
                        {formatPrice(totalPrice.amount, totalPrice.currencyCode)}
                      </span>
                    )}
                    {itemsCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Package size={14} />
                        {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                      </span>
                    )}
                  </div>
                </div>
                {open ? (
                  <ChevronUp className="w-5 h-5 text-secondary group-hover:text-primary transition-colors shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-secondary group-hover:text-primary transition-colors shrink-0" />
                )}
              </button>
            </CollapsibleTrigger>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="space-y-6 px-4 md:px-6 pb-4 md:pb-6">
              {orderItems.length > 0 && (
                <div className="space-y-3 pb-4 border-b">
                  <h6 className="text-heading-4">Order Items</h6>
                  <div className="space-y-2">
                    {orderItems.slice(0, 3).map((item, index) => {
                      if (!item) return null;
                      const product = item.variant?.product;
                      const productHandle = product?.handle;

                      return (
                        <div
                          key={`order-item-${index + 1}`}
                          className="flex items-center justify-between gap-4 py-2 text-body-sm"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {item.variant?.image && (
                              <div className="relative w-12 h-12 rounded overflow-hidden bg-muted shrink-0">
                                <img
                                  src={item.variant.image.small || item.variant.image.url}
                                  alt={item.variant.image.altText || item.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              {productHandle ? (
                                <Link
                                  href={`${config.routes.collection}/products/${productHandle}`}
                                  className="font-medium hover:underline line-clamp-1"
                                >
                                  {item.title}
                                </Link>
                              ) : (
                                <p className="font-medium line-clamp-1">{item.title}</p>
                              )}
                              {item.variant?.title && item.variant.title !== 'Default Title' && (
                                <p className="text-secondary text-caption-sm">
                                  {item.variant.title}
                                </p>
                              )}
                              <p className="text-secondary">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          {item.discountedTotalPrice && (
                            <div className="text-body font-medium shrink-0">
                              {formatPrice(
                                item.discountedTotalPrice.amount,
                                item.discountedTotalPrice.currencyCode,
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {orderItems.length > 3 && (
                      <p className="text-body-sm text-secondary pt-2">
                        +{orderItems.length - 3} more{' '}
                        {orderItems.length - 3 === 1 ? 'item' : 'items'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <h6 className="text-heading-4">Order Details</h6>

                {subtotalPrice && (
                  <Row
                    label="Subtotal"
                    value={formatPrice(subtotalPrice.amount, subtotalPrice.currencyCode)}
                  />
                )}
                {totalPrice && (
                  <Row
                    label="Total"
                    value={formatPrice(totalPrice.amount, totalPrice.currencyCode)}
                  />
                )}

                {totalRefunded?.amount && Number(totalRefunded.amount) > 0 && (
                  <Row
                    label="Refunded"
                    value={formatPrice(totalRefunded.amount, totalRefunded.currencyCode)}
                  />
                )}

                <Row label="Financial Status" value={formatStatus(financialStatus)} />
                <Row label="Fulfillment Status" value={formatStatus(fulfillmentStatus)} />
                <Row label="Email" value={email || DEFAULTS.na} />
                {phone && <Row label="Phone" value={phone} />}
                {typeof order?.processedAt === 'string' && (
                  <Row label="Processed At" value={formatDate(order.processedAt)} />
                )}

                {shippingAddress?.name && (
                  <Row label="Shipping To" value={shippingAddress.formatted.join(', ')} />
                )}

                {typeof order?.canceledAt === 'string' && typeof cancelReason === 'string' && (
                  <>
                    <Row label="Cancel Reason" value={cancelReason} />
                    <Row label="Canceled At" value={formatDate(order.canceledAt)} />
                  </>
                )}
              </div>

              {successfulFulfillments && successfulFulfillments.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h6 className="text-heading-4">Tracking Information</h6>

                  {successfulFulfillments.map((fulfillment, index) => {
                    const { trackingInfo, trackingCompany } = fulfillment;

                    if (!trackingInfo || trackingInfo.length === 0) return null;

                    return (
                      <div
                        key={`${fulfillment.trackingCompany ?? 'carrier'}-${index}`}
                        className="space-y-2"
                      >
                        <div className={`flex justify-between py-1 border-b border-border `}>
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
                            className="flex justify-between py-1 border-b border-border"
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
