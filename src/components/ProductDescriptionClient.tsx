'use client';

import Link from 'next/link';

import config from '@/config';
import useProductSelection from '@/hooks/useProductSelection';
import type { ProductVariantView } from '@/hooks/useProductVariantView';
import useProductVariantView from '@/hooks/useProductVariantView';
import type { GetProductByHandleQuery } from '@/shopify/storefront';
import { cn } from '@/utils/cn';
import { formatPrice } from '@/utils/format';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import Options from './Options';
import ProductActions from './ProductActions';
import ProductPrice from './ProductPrice';
import QuantityStepper from './QuantityStepper';

import { RotateCcw, ShieldCheck } from 'lucide-react';

type ProductDescriptionClientProps = {
  product: NonNullable<GetProductByHandleQuery['product']>;
  isModal?: boolean;
  defaultVariant: ProductVariantView;
  descriptionHtml: string;
  productId: string;
};

const MetaItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1">
    <dt className="text-label-sm text-muted">{label}</dt>
    <dd className="text-secondary">{value}</dd>
  </div>
);

const AvailabilityLine = ({
  availableForSale,
  quantityAvailable,
  unavailable,
}: {
  availableForSale?: boolean;
  quantityAvailable?: number | null;
  unavailable?: boolean;
}) => {
  const isSoldOut = availableForSale === false;
  const isLowStock =
    !isSoldOut &&
    typeof quantityAvailable === 'number' &&
    quantityAvailable > 0 &&
    quantityAvailable < 5;

  const label = unavailable
    ? 'Unavailable in this combination'
    : isSoldOut
      ? 'Sold out'
      : isLowStock
        ? `Only ${quantityAvailable} left`
        : 'In stock';

  return (
    <p
      className={cn(
        'inline-flex items-center gap-2 text-body-sm font-medium',
        unavailable || isSoldOut
          ? 'text-muted'
          : isLowStock
            ? 'text-destructive'
            : 'text-secondary',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 rounded-full bg-current',
          !unavailable && !isSoldOut && !isLowStock && 'animate-pulse-subtle',
        )}
      />
      {label}
    </p>
  );
};

const ProductDescriptionClient = ({
  product,
  isModal,
  defaultVariant,
  descriptionHtml,
  productId,
}: ProductDescriptionClientProps) => {
  const {
    handleAddToCart,
    selectedVariant,
    totalPrice,
    handleSetSelectedProductOption,
    quantity,
    handleChangeInput,
    isAdding,
    isOptionSelected,
    isOptionOutOfStock,
    isSelectionUnavailable,
  } = useProductSelection({ product });

  const {
    quantityAvailable,
    availableForSale,
    price,
    compareAtPrice,
    sku,
    title: variantTitle,
    weight,
    weightUnit,
    quantityCap,
    hasDiscount,
  } = useProductVariantView(selectedVariant, defaultVariant);

  return (
    <div className="flex flex-col gap-8 lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
      <div className="space-y-4">
        {(product.vendor || product.productType) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {product.vendor ? <span className="text-eyebrow">{product.vendor}</span> : null}
            {product.vendor && product.productType ? (
              <span className="text-muted" aria-hidden="true">
                ·
              </span>
            ) : null}
            {product.productType ? (
              <span className="text-eyebrow text-muted">{product.productType}</span>
            ) : null}
          </div>
        )}

        <h1 className="text-heading-2">{product.title}</h1>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline gap-3">
            <ProductPrice
              price={price}
              compareAtPrice={compareAtPrice}
              hasDiscount={hasDiscount}
              priceClassName="text-heading-3 font-semibold tabular-nums text-foreground"
              compareAtPriceClassName="text-body text-muted line-through tabular-nums"
            />
            {hasDiscount ? <Badge variant="destructive">Sale</Badge> : null}
          </div>
          {quantity > 1 && price ? (
            <span className="text-body-sm text-secondary">
              Total: {formatPrice(totalPrice, price.currencyCode)}
            </span>
          ) : null}
          <AvailabilityLine
            availableForSale={availableForSale}
            quantityAvailable={quantityAvailable}
            unavailable={isSelectionUnavailable}
          />
        </div>
      </div>

      <Separator className="bg-border/70" />

      {!isModal && (
        <Accordion type="single" collapsible defaultValue="details" className="w-full">
          <AccordionItem value="details">
            <AccordionTrigger className="text-label hover:no-underline">
              Description
            </AccordionTrigger>
            <AccordionContent>
              {descriptionHtml ? (
                <div
                  className="product-description prose prose-sm max-w-none text-secondary dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              ) : (
                <p className="text-body text-secondary">
                  Experience premium quality and exceptional design with this product. Perfect for
                  everyday use and special occasions alike.
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="specs">
            <AccordionTrigger className="text-label hover:no-underline">
              Specifications
            </AccordionTrigger>
            <AccordionContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {sku ? <MetaItem label="SKU" value={sku} /> : null}
                {variantTitle ? <MetaItem label="Variant" value={variantTitle} /> : null}
                {weight ? (
                  <MetaItem
                    label="Weight"
                    value={`${weight} ${weightUnit?.toLowerCase() ?? ''}`.trim()}
                  />
                ) : null}
                {quantityAvailable !== null && quantityAvailable !== undefined ? (
                  <MetaItem label="Available" value={`${quantityAvailable} units`} />
                ) : null}
              </dl>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      <div className="rounded-[var(--radius)] border border-border/70 bg-card p-5 md:p-6">
        <div className="space-y-6">
          {product.options && product.options.length > 0 ? (
            <Options
              options={product.options}
              onClick={handleSetSelectedProductOption}
              isOptionSelected={isOptionSelected}
              isOptionOutOfStock={isOptionOutOfStock}
            />
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-label">Quantity</h2>
              {quantityAvailable !== null && quantityAvailable !== undefined ? (
                <span className="text-caption-sm text-muted">{quantityAvailable} available</span>
              ) : null}
            </div>
            <QuantityStepper
              quantity={quantity}
              onChange={handleChangeInput}
              quantityAvailable={quantityAvailable}
              disabled={!availableForSale || isSelectionUnavailable}
            />
          </div>

          <ProductActions
            productId={productId}
            availableForSale={!!availableForSale}
            disabled={quantityCap !== undefined && quantity > quantityCap}
            loading={isAdding}
            onAddToCart={handleAddToCart}
            unavailable={isSelectionUnavailable}
          />
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-caption-sm text-secondary">
        <li className="inline-flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Secure checkout
        </li>
        <li className="inline-flex items-center gap-2">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          <Link href={config.routes.refund} className="link-underline">
            Returns &amp; refunds
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default ProductDescriptionClient;
