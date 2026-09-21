'use client';

import { useState } from 'react';

import useProductSelection from '@/hooks/useProductSelection';
import type { GetProductByHandleQuery } from '@/shopify/storefront';
import { formatPrice } from '@/utils/format';
import { getQuantityCap } from '@/utils/inventory';

import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import Options from './Options';
import ProductActions from './ProductActions';
import ProductQuantitySelector from './ProductQuantitySelector';

import { Info } from 'lucide-react';

type ProductDescriptionClientProps = {
  product: NonNullable<GetProductByHandleQuery['product']>;
  isModal?: boolean;
  defaultVariant: {
    quantityAvailable?: number | null;
    availableForSale?: boolean;
    price?: { amount: string; currencyCode: string } | null | undefined;
    compareAtPrice?: { amount: string; currencyCode: string } | null | undefined;
    sku?: string | null;
    title?: string;
    weight?: number | null;
    weightUnit?: string;
  };
  descriptionHtml: string;
  productId: string;
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
    isOptionSelected,
    isOptionOutOfStock,
  } = useProductSelection({ product });
  const [activeTab, setActiveTab] = useState('details');

  const selectedVariantData = selectedVariant as
    | {
        quantityAvailable?: number | null;
        availableForSale?: boolean;
        price?: { amount: string; currencyCode: string };
        compareAtPrice?: { amount: string; currencyCode: string } | null;
        sku?: string | null;
        title?: string;
        weight?: number | null;
        weightUnit?: string;
      }
    | undefined;

  const {
    quantityAvailable,
    availableForSale,
    price,
    compareAtPrice,
    sku,
    title: variantTitle,
    weight,
    weightUnit,
  } = selectedVariantData || defaultVariant;

  // Inventory is often untracked (quantityAvailable === null), which means
  // "unlimited" rather than "out of stock".
  const quantityCap = getQuantityCap(quantityAvailable);

  const hasDiscount =
    compareAtPrice &&
    price &&
    Number(compareAtPrice.amount) > Number(price.amount);

  return (
    <div className="flex flex-col gap-6 lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {product.productType && (
            <Badge variant="outline" className="text-caption-sm">
              {product.productType}
            </Badge>
          )}
          {product.vendor && (
            <Badge variant="outline" className="text-caption-sm">
              {product.vendor}
            </Badge>
          )}
        </div>

        <h1 className="text-heading-1 font-bold">{product.title}</h1>

        <div className="flex flex-col gap-1">
          {price && (
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-heading-3 text-primary font-semibold">
                {formatPrice(price.amount, price.currencyCode)}
              </span>
              {hasDiscount && compareAtPrice && (
                <span className="text-body text-muted-foreground line-through">
                  {formatPrice(compareAtPrice.amount, compareAtPrice.currencyCode)}
                </span>
              )}
              {hasDiscount && (
                <Badge variant="destructive" className="text-body-sm font-medium">
                  Sale
                </Badge>
              )}
            </div>
          )}
          {quantity > 1 && price && (
            <span className="text-body-sm text-secondary">
              Total: {formatPrice(totalPrice, price.currencyCode)}
            </span>
          )}
        </div>
      </div>

      <Separator />

      {!isModal && (
        <Tabs
          defaultValue="details"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Product Details</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="mt-4 space-y-4">
            {descriptionHtml ? (
              <div
                className="product-description prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            ) : (
              <p className="text-body text-secondary">
                Experience premium quality and exceptional design with this product. Perfect for
                everyday use and special occasions alike.
              </p>
            )}
          </TabsContent>
          <TabsContent value="specs" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-body-sm">
              {sku && (
                <div className="flex flex-col gap-1">
                  <span className="text-label font-medium">SKU</span>
                  <span className="text-secondary">{sku}</span>
                </div>
              )}
              {variantTitle && (
                <div className="flex flex-col gap-1">
                  <span className="text-label font-medium">Variant</span>
                  <span className="text-secondary">{variantTitle}</span>
                </div>
              )}
              {weight && (
                <div className="flex flex-col gap-1">
                  <span className="text-label font-medium">Weight</span>
                  <span className="text-secondary">{`${weight} ${weightUnit?.toLowerCase()}`}</span>
                </div>
              )}
              {quantityAvailable !== undefined && (
                <div className="flex flex-col gap-1">
                  <span className="text-label font-medium">Available</span>
                  <span className="text-secondary">{quantityAvailable} units</span>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {product.options && product.options.length > 0 && (
              <div className="space-y-3">
                <Options
                  options={product.options}
                  onClick={handleSetSelectedProductOption}
                  isOptionSelected={isOptionSelected}
                  isOptionOutOfStock={isOptionOutOfStock}
                />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-label font-medium">Quantity</h3>
                {quantityAvailable !== null && quantityAvailable !== undefined && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-secondary cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Maximum {quantityAvailable} units available</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <ProductQuantitySelector
                quantity={quantity}
                onChange={handleChangeInput}
                quantityAvailable={quantityAvailable}
                disabled={!availableForSale}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <ProductActions
        productId={productId}
        availableForSale={!!availableForSale}
        disabled={quantityCap !== undefined && quantity > quantityCap}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
};

export default ProductDescriptionClient;
