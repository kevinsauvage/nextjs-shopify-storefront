'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/utils/cn';

import { ChevronLeft, ChevronRight, Expand } from 'lucide-react';

type PhotoGalleryProps = {
  images: ImageFields[];
  className?: string;
};

/**
 * Shopify product imagery is a 3:4 portrait (1000×1333). Matching the frame to
 * that ratio means `object-cover` fills it edge-to-edge with no letterbox and
 * no wasted space, while `object-contain` (lightbox) shows the whole image.
 */
const IMAGE_ASPECT_RATIO = 'aspect-[3/4]';

/**
 * On large screens a 3:4 frame sized by column width grows taller than the
 * viewport (a ~700px-wide column becomes ~930px tall). The stage is therefore
 * height-capped and its width derived from the ratio, so the gallery always
 * fits above the fold alongside the sticky buy box.
 *
 * `w-full` is required: a `<button>` is inline-block and, because both images
 * are `fill` (absolutely positioned), it has no intrinsic width — without it the
 * button collapses to 0×0 and the image is invisible. `max-h` then clamps the
 * ratio-derived height, and `object-contain` keeps the capped frame centred.
 */
const STAGE_SIZE = 'w-full aspect-[3/4] max-h-[clamp(26rem,72vh,44rem)]';
const THUMB_RAIL_MAX_HEIGHT = 'lg:max-h-[clamp(26rem,72vh,44rem)]';

/**
 * Product gallery.
 *
 * Shopify product images are portrait (1000×1333, a 3:4 ratio). The stage
 * matches that ratio so the image fills it without being cropped, upscaled or
 * letterboxed; a soft blurred copy sits behind any remaining space.
 *
 * - Desktop: vertical thumbnail rail left, large stage right.
 * - Mobile: stage first, horizontally scrollable thumbnail strip below.
 * - Stage opens a full-screen lightbox; arrow keys cycle images everywhere.
 */
const PhotoGallery = ({ images, className }: PhotoGalleryProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const galleryRef = useRef<HTMLDivElement | null>(null);

  const imageCount = images?.length ?? 0;
  const hasMultipleImages = imageCount > 1;
  const selectedImage = images?.[selectedImageIndex] ?? images?.[0];

  const goTo = useCallback(
    (index: number) => {
      if (imageCount <= 1) return;
      setSelectedImageIndex(((index % imageCount) + imageCount) % imageCount);
    },
    [imageCount],
  );

  // Arrow-key navigation, scoped to the gallery or the open lightbox.
  useEffect(() => {
    if (!hasMultipleImages) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

      // Never hijack keys from text inputs or other interactive widgets.
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.closest('input, textarea, select, [role="textbox"], [contenteditable="true"]')
      ) {
        return;
      }

      // The lightbox is portalled outside this subtree, so it is always handled.
      const isWithinGallery = galleryRef.current?.contains(target ?? null) ?? false;
      if (!isLightboxOpen && !isWithinGallery) return;

      event.preventDefault();
      goTo(event.key === 'ArrowLeft' ? selectedImageIndex - 1 : selectedImageIndex + 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goTo, selectedImageIndex, hasMultipleImages, isLightboxOpen]);

  if (imageCount === 0) {
    return (
      <div className={cn('relative', className)}>
        <div
          className={cn('media-frame flex w-full items-center justify-center', IMAGE_ASPECT_RATIO)}
        >
          <span className="text-body-sm text-secondary">No image available</span>
        </div>{' '}
      </div>
    );
  }

  const arrows = hasMultipleImages ? (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          goTo(selectedImageIndex - 1);
        }}
        aria-label="Previous image"
        className="absolute left-2 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/50 bg-background/85 text-foreground shadow-sm opacity-0 backdrop-blur-md transition-all duration-300 hover:bg-background focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 group-hover/stage:opacity-100 sm:left-3"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          goTo(selectedImageIndex + 1);
        }}
        aria-label="Next image"
        className="absolute right-2 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/50 bg-background/85 text-foreground shadow-sm opacity-0 backdrop-blur-md transition-all duration-300 hover:bg-background focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 group-hover/stage:opacity-100 sm:right-3"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </>
  ) : null;

  return (
    <div
      ref={galleryRef}
      className={cn('lg:grid lg:grid-cols-[76px_1fr] lg:items-start lg:gap-4', className)}
    >
      {/* Thumbnail rail (vertical on desktop, horizontal scroll on mobile) */}
      {hasMultipleImages ? (
        <div
          className={cn(
            'order-2 mt-3 flex gap-2 overflow-x-auto pb-1 lg:order-1 lg:mt-0 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0 lg:pr-1',
            THUMB_RAIL_MAX_HEIGHT,
          )}
          role="tablist"
          aria-label="Product images"
        >
          {images.map((image, index) => {
            const isSelected = index === selectedImageIndex;
            return (
              <button
                key={image.src || `thumbnail-${index}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`Product image ${index + 1} of ${imageCount}`}
                onClick={() => setSelectedImageIndex(index)}
                className={cn(
                  IMAGE_ASPECT_RATIO,
                  'relative w-16 shrink-0 overflow-hidden rounded-[calc(var(--radius)-2px)] border transition-all duration-200 lg:w-full',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  isSelected
                    ? 'border-foreground opacity-100'
                    : 'border-border/60 opacity-60 hover:opacity-100',
                )}
              >
                <Image
                  src={image.small || image.medium || image.src}
                  alt={image.altText || `Product thumbnail ${index + 1}`}
                  fill
                  quality={70}
                  sizes="76px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Stage */}
      <div className="group/stage relative order-1 lg:order-2">
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          aria-label={`Open image ${selectedImageIndex + 1} in full screen`}
          className={cn(
            'media-frame relative block cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            STAGE_SIZE,
          )}
        >
          {/* Blurred backdrop fills any space the contained image leaves. */}
          {selectedImage?.blurDataURL ? (
            <Image
              key={`stage-blur-${selectedImageIndex}`}
              src={selectedImage.blurDataURL}
              alt=""
              aria-hidden="true"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="scale-110 object-cover blur-3xl"
            />
          ) : null}

          <Image
            key={`stage-${selectedImageIndex}`}
            src={selectedImage?.large || selectedImage?.src || ''}
            alt={
              selectedImage?.altText ?? `Product image ${selectedImageIndex + 1} of ${imageCount}`
            }
            fill
            preload={selectedImageIndex === 0}
            quality={85}
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 60vw, 40vw"
            className="relative z-10 object-cover"
          />

          <span className="pointer-events-none absolute right-3 top-3 z-20 flex size-9 items-center justify-center rounded-full border border-border/50 bg-background/80 text-foreground opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover/stage:opacity-100">
            <Expand className="h-4 w-4" aria-hidden="true" />
          </span>

          {hasMultipleImages ? (
            <span className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-full border border-border/50 bg-background/80 px-3 py-1 text-caption-sm font-medium tabular-nums text-foreground backdrop-blur-md">
              {selectedImageIndex + 1} / {imageCount}
            </span>
          ) : null}
        </button>

        {arrows}
      </div>

      {/* Lightbox */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-4xl gap-0 border-border/60 bg-background p-0">
          <DialogTitle className="sr-only">{`${selectedImage?.altText || 'Product image'} (${selectedImageIndex + 1} of ${imageCount})`}</DialogTitle>
          {/* Height-capped so tall portrait images never overflow the viewport. */}
          <div className={cn('relative mx-auto max-h-[85vh] w-full', IMAGE_ASPECT_RATIO)}>
            {selectedImage?.blurDataURL ? (
              <Image
                src={selectedImage.blurDataURL}
                alt=""
                aria-hidden="true"
                fill
                sizes="(max-width: 768px) 100vw, 80vw"
                className="scale-110 object-cover blur-3xl"
              />
            ) : null}
            <Image
              src={selectedImage?.large || selectedImage?.src || ''}
              alt={selectedImage?.altText ?? 'Product image'}
              fill
              quality={90}
              sizes="(max-width: 768px) 100vw, 80vw"
              className="relative z-10 object-contain"
            />
          </div>

          {arrows}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhotoGallery;
