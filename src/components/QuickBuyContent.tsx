'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import config from '@/config';
import useProductSelection from '@/hooks/useProductSelection';
import useProductVariantView from '@/hooks/useProductVariantView';
import type { ProductFieldsFragment } from '@/shopify/storefront';
import { cn } from '@/utils/cn';
import { discountPercentOf, formatPrice } from '@/utils/format';
import { mapShopifyImagesToImageFields } from '@/utils/images';
import { isLowStock, isSoldOut } from '@/utils/inventory';

import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { SheetFooter } from './ui/sheet';
import Options from './Options';
import ProductActions from './ProductActions';
import ProductPrice from './ProductPrice';
import QuantityStepper from './QuantityStepper';

import { ChevronLeft, ChevronRight } from 'lucide-react';

type QuickBuyContentProps = {
  product: ProductFieldsFragment;
  onClose?: () => void;
};

const QuickBuyContent = ({ product, onClose }: QuickBuyContentProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

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

  const productImages = mapShopifyImagesToImageFields(product.images?.edges);

  const { quantityAvailable, availableForSale, price, compareAtPrice, quantityCap, hasDiscount } =
    useProductVariantView(selectedVariant);

  const nextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
  }, [productImages.length]);

  const prevImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
  }, [productImages.length]);

  const handleAddToCartAndClose = useCallback(() => {
    handleAddToCart();
    onClose?.();
  }, [handleAddToCart, onClose]);

  // Scroll thumbnail strip to show current image
  useEffect(() => {
    if (thumbnailsRef.current) {
      const thumbnail = thumbnailsRef.current.children[currentImageIndex] as HTMLElement;
      if (thumbnail) {
        thumbnail.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'start',
        });
      }
    }
  }, [currentImageIndex]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Image Carousel */}
        <div className="relative bg-muted/30">
          <div className="aspect-[3/4] relative overflow-hidden">
            {productImages.length > 0 && (
              <Image
                src={
                  productImages[currentImageIndex]?.medium ||
                  productImages[currentImageIndex]?.src ||
                  ''
                }
                alt={productImages[currentImageIndex]?.altText || product.title}
                fill
                quality={75}
                className="object-cover transition-opacity duration-300"
                sizes="(max-width: 640px) 100vw, 500px"
                loading="eager"
              />
            )}

            {/* Navigation Arrows */}
            {productImages.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background"
                  onClick={prevImage}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background"
                  onClick={nextImage}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {isSoldOut(availableForSale) ? (
                <Badge variant="destructive" className="px-2.5 py-1">
                  Sold Out
                </Badge>
              ) : null}
              {isLowStock(quantityAvailable, availableForSale) ? (
                <Badge variant="secondary" className="px-2.5 py-1">
                  Only {quantityAvailable} left
                </Badge>
              ) : null}
              {hasDiscount && compareAtPrice && price ? (
                <Badge className="px-2.5 py-1 bg-red-500 text-white">
                  {discountPercentOf(price.amount, compareAtPrice.amount)}% OFF
                </Badge>
              ) : null}
            </div>
          </div>

          {/* Dot Indicators */}
          {productImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {productImages.map((image, index) => (
                <button
                  key={image.src || `image-${index}`}
                  type="button"
                  onClick={() => setCurrentImageIndex(index)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all duration-200',
                    index === currentImageIndex
                      ? 'bg-primary w-6'
                      : 'bg-primary/30 hover:bg-primary/50',
                  )}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail Strip */}
        {productImages.length > 1 && (
          <div ref={thumbnailsRef} className="flex gap-2 p-4 overflow-x-auto scroll-smooth">
            {productImages.map((image, index) => (
              <button
                key={image.src || `image-${index}`}
                onClick={() => setCurrentImageIndex(index)}
                className={cn(
                  'relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all',
                  index === currentImageIndex
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-transparent hover:border-muted-foreground/30',
                )}
                aria-label={`View product image ${index + 1} of ${productImages.length}`}
                aria-pressed={index === currentImageIndex}
              >
                <Image
                  src={image.small || image.src || ''}
                  alt={image.altText || `Product image ${index + 1}`}
                  fill
                  quality={70}
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        )}

        <Separator />

        {/* Product Info */}
        <div className="p-4 space-y-4">
          {/* Title & Price */}
          <div>
            {product.productType && (
              <span className="text-label-sm text-secondary">{product.productType}</span>
            )}
            <h2 className="text-heading-4 mt-1">{product.title}</h2>
            <div className="flex items-baseline gap-2 mt-2">
              <ProductPrice
                price={price}
                compareAtPrice={compareAtPrice}
                hasDiscount={hasDiscount}
                priceClassName="text-heading-3 text-primary"
                compareAtPriceClassName="text-body text-muted line-through"
              />
            </div>
            {quantity > 1 && price && (
              <p className="text-body-sm text-secondary mt-1">
                Total: {formatPrice(totalPrice, price.currencyCode)}
              </p>
            )}
          </div>

          <Separator />

          {/* Options */}
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

          {/* Quantity Selector */}
          <div className="space-y-2">
            {/* Plain text, not a label: `QuantityStepper` renders buttons (already
                labelled) and a live-region value, not a labelled input. */}
            <span className="text-label">Quantity</span>
            <QuantityStepper
              quantity={quantity}
              onChange={handleChangeInput}
              quantityAvailable={quantityAvailable}
              showAvailable
              disabled={isSelectionUnavailable}
            />
          </div>
        </div>
      </div>

      <SheetFooter className="flex-shrink-0 border-t">
        <ProductActions
          productId={product.id}
          availableForSale={!!availableForSale}
          disabled={quantityCap !== undefined && quantity > quantityCap}
          loading={isAdding}
          onAddToCart={handleAddToCartAndClose}
          unavailable={isSelectionUnavailable}
          compact
        />

        <Link
          href={`${config.routes.collection}/products/${product.handle}`}
          className="block w-full text-center text-body-sm text-secondary hover:text-primary transition-colors"
          onClick={onClose}
        >
          View full details →
        </Link>
      </SheetFooter>
    </div>
  );
};

export default QuickBuyContent;
