import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import BackButton from '@/app/account/_components/BackButton';
import { formatStatus, getStatusBadgeVariant } from '@/app/account/_components/orderDisplay';
import TrackingInfo from '@/app/account/_components/TrackingInfo';
import CardHeaderPattern from '@/components/CardHeaderPattern';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import config from '@/config';
import { DEFAULTS } from '@/config/constants';
import seo from '@/data/seo';
import { getOrderById } from '@/lib/server/account';
import { getShopifyToken } from '@/lib/server/shopify-helpers';
import type { OrderFieldsFragment } from '@/shopify/storefront';
import { formatDate, formatPrice } from '@/utils/format';

import OrderDetailActions from './_components/OrderDetailActions';

type OrderDetailParams = {
  orderId: string;
};

const getOrder = async (orderId: string): Promise<OrderFieldsFragment | null> => {
  const token = await getShopifyToken();

  if (!token) {
    redirect(config.routes.login);
  }

  return getOrderById(token, orderId);
};

export const generateMetadata = async ({
  params,
}: {
  params: Promise<OrderDetailParams>;
}): Promise<Metadata> => {
  const { orderId } = await params;
  const order = await getOrder(orderId);

  if (!order) return {};

  return {
    description: seo.account.orders.description,
    title: `Order ${order.name}`,
    robots: { index: false, follow: false },
  };
};

const DetailRow = ({ label, value }: { label: string; value: string | number | null }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-border/70 py-2">
    <dt className="whitespace-nowrap text-body-sm text-secondary">{label}</dt>
    <dd className="text-right text-body-sm font-medium">{value}</dd>
  </div>
);

const OrderDetailPage = async ({ params }: { params: Promise<OrderDetailParams> }) => {
  const { orderId } = await params;
  const order = await getOrder(orderId);

  if (!order) {
    notFound();
  }

  const lineItems = order.lineItems.edges.map((edge) => edge.node);
  const itemsCount = lineItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeaderPattern
          as="h2"
          title={`Order ${order.name}`}
          size={3}
          actions={<OrderDetailActions orderId={orderId} orderName={order.name} />}
          description={
            typeof order.processedAt === 'string'
              ? `Placed on ${formatDate(order.processedAt)} · ${itemsCount} ${itemsCount === 1 ? 'item' : 'items'}`
              : `${itemsCount} ${itemsCount === 1 ? 'item' : 'items'}`
          }
        />
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {order.fulfillmentStatus && (
              <Badge variant={getStatusBadgeVariant(order.fulfillmentStatus)}>
                {formatStatus(order.fulfillmentStatus)}
              </Badge>
            )}
            {order.financialStatus && (
              <Badge variant={getStatusBadgeVariant(order.financialStatus)}>
                {formatStatus(order.financialStatus)}
              </Badge>
            )}
            {typeof order.customerUrl === 'string' && (
              <a
                href={order.customerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-body-sm font-medium link"
              >
                Live tracking
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="text-heading-4 mb-3">Items</h3>
          <div className="divide-y divide-border/70">
            {lineItems.map((item, index) => {
              const productHandle = item.variant?.product?.handle;

              return (
                <div
                  key={`${item.variant?.id ?? item.title}-${index + 1}`}
                  className="flex items-center justify-between gap-4 py-3 text-body-sm first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {item.variant?.image && (
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={item.variant.image.small || item.variant.image.url}
                          alt={item.variant.image.altText || item.title}
                          width={56}
                          height={56}
                          sizes="56px"
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
                        <p className="text-caption-sm text-secondary">{item.variant.title}</p>
                      )}
                      <p className="text-secondary">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-body font-medium tabular-nums">
                    {formatPrice(
                      item.discountedTotalPrice.amount,
                      item.discountedTotalPrice.currencyCode,
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="text-heading-4 mb-3">Summary</h3>
          <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            {order.subtotalPrice && (
              <DetailRow
                label="Subtotal"
                value={formatPrice(order.subtotalPrice.amount, order.subtotalPrice.currencyCode)}
              />
            )}
            <DetailRow
              label="Shipping"
              value={formatPrice(
                order.totalShippingPrice.amount,
                order.totalShippingPrice.currencyCode,
              )}
            />
            {order.totalTaxV2 && (
              <DetailRow
                label="Taxes"
                value={formatPrice(order.totalTaxV2.amount, order.totalTaxV2.currencyCode)}
              />
            )}
            <DetailRow
              label="Total"
              value={formatPrice(order.totalPrice.amount, order.totalPrice.currencyCode)}
            />
            {order.totalRefunded?.amount && Number(order.totalRefunded.amount) > 0 && (
              <DetailRow
                label="Refunded"
                value={formatPrice(order.totalRefunded.amount, order.totalRefunded.currencyCode)}
              />
            )}
            <DetailRow label="Financial status" value={formatStatus(order.financialStatus)} />
            <DetailRow label="Fulfillment status" value={formatStatus(order.fulfillmentStatus)} />
            <DetailRow label="Email" value={order.email || DEFAULTS.na} />
            {order.phone && <DetailRow label="Phone" value={order.phone} />}
            {order.shippingAddress?.name && (
              <DetailRow label="Shipping to" value={order.shippingAddress.formatted.join(', ')} />
            )}
            {typeof order.canceledAt === 'string' && typeof order.cancelReason === 'string' && (
              <>
                <DetailRow label="Cancel reason" value={order.cancelReason} />
                <DetailRow label="Canceled at" value={formatDate(order.canceledAt)} />
              </>
            )}
          </dl>

          {order.customAttributes.length > 0 && (
            <div className="mt-4">
              <h4 className="text-heading-4 mb-3">Order notes</h4>
              <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                {order.customAttributes.map((attribute) => (
                  <DetailRow
                    key={attribute.key}
                    label={attribute.key}
                    value={attribute.value ?? DEFAULTS.na}
                  />
                ))}
              </dl>
            </div>
          )}

          <div className="mt-4">
            <TrackingInfo fulfillments={order.successfulFulfillments} />
          </div>
        </CardContent>
      </Card>

      <BackButton />
    </div>
  );
};

export default OrderDetailPage;
