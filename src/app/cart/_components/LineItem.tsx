import Link from 'next/link';

import OptimizedImage from '@/components/OptimizedImage';
import config from '@/config';
import { type CartFieldsFragment } from '@/shopify/storefront';
import { formatPrice } from '@/utils/format';

import CartRemove from './CartRemove';
import QuantityUpdatedContainer from './QuantityUpdatedContainer';

type CartLineNode = CartFieldsFragment['lines']['edges'][number]['node'];

const LineItem: React.FC<{
  node: CartLineNode;
}> = ({ node }) => {
  if (!('merchandise' in node)) return null;

  // Use Shopify's authoritative per-line cost rather than the variant's current
  // price, which can drift from the cart (the price may have changed since the
  // item was added).
  const unitPrice = Number.parseFloat(node.cost.amountPerQuantity.amount);
  const totalPrice = Number.parseFloat(node.cost.subtotalAmount.amount);
  const finalPrice = Number.parseFloat(node.cost.totalAmount.amount);
  const totalDiscount = Math.max(0, totalPrice - finalPrice);
  const hasDiscount = totalDiscount > 0;
  const { currencyCode } = node.cost.totalAmount;

  // Get product handle for link
  const productHandle =
    'product' in node.merchandise && node.merchandise.product?.handle
      ? `${config.routes.collection}/products/${node.merchandise.product.handle}`
      : '#';

  return (
    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6 group">
      {/* Product Image & Info */}
      <div className="flex gap-4 flex-1 min-w-0">
        <Link href={productHandle} className="shrink-0 hover:opacity-80 transition-opacity">
          {node.merchandise.image?.medium ? (
            <OptimizedImage
              src={String(node.merchandise.image.medium)}
              alt={node.merchandise.product.title}
              width={120}
              height={120}
              quality={75}
              sizes="120px"
              className="rounded-lg object-cover border border-border"
            />
          ) : (
            <div className="w-[120px] h-[120px] rounded-lg bg-muted flex items-center justify-center">
              <span className="text-caption-sm text-secondary">No image</span>
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={productHandle}>
            <h3 className="text-heading-4 mb-1 hover:text-primary transition-colors line-clamp-2">
              {node.merchandise.product.title}
            </h3>
          </Link>
          {node.merchandise.selectedOptions && node.merchandise.selectedOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 mb-2">
              {node.merchandise.selectedOptions.map(
                (option: { name: string; value: string }, index: number) => (
                  <span key={option.name} className="text-body-sm text-secondary">
                    {option.name}: <span className="font-medium">{option.value}</span>
                    {index < node.merchandise.selectedOptions.length - 1 && (
                      <span className="mx-1.5">•</span>
                    )}
                  </span>
                ),
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <p className="text-body-sm text-secondary">
              Unit: {formatPrice(unitPrice, currencyCode)}
            </p>
            {hasDiscount && (
              <span className="text-caption-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                Discounted
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quantity, Price & Remove */}
      <div className="flex items-center justify-between sm:justify-end gap-4 sm:flex-col sm:items-end sm:gap-3">
        <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-3">
          <QuantityUpdatedContainer
            originalQuantity={node.quantity}
            quantityAvailable={node.merchandise.quantityAvailable}
            id={node.id}
            disabled={finalPrice <= 0}
          />
          <div className="flex flex-col items-end min-w-[100px]">
            <div className="text-right">
              <p className="text-heading-4 font-semibold">
                {formatPrice(finalPrice, currencyCode)}
              </p>
              {hasDiscount && (
                <p className="text-body-sm text-muted line-through mt-0.5">
                  {formatPrice(totalPrice, currencyCode)}
                </p>
              )}
            </div>
            {node.quantity > 1 && (
              <p className="text-caption-sm text-muted mt-1">
                {formatPrice(unitPrice, currencyCode)} each
              </p>
            )}
          </div>
        </div>
        <CartRemove id={node.id} productTitle={node.merchandise.product.title} />
      </div>
    </div>
  );
};

export default LineItem;
