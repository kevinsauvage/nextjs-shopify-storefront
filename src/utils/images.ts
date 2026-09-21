import type { ImageFieldsFragment } from '@/shopify/storefront';

export function mapShopifyImageToImageFields(
  image: ImageFieldsFragment | null | undefined,
): ImageFields | null {
  if (!image) return null;

  return {
    altText: image.altText ?? null,
    blurDataURL: String(image.blurDataURL || ''),
    height: image.height ?? null,
    large: String(image.large || image.src || ''),
    medium: String(image.medium || image.src || ''),
    small: String(image.small || image.src || ''),
    src: String(image.src || image.url || ''),
    width: image.width ?? null,
  };
}

export function mapShopifyImagesToImageFields(
  images: Array<{ node: ImageFieldsFragment }> | null | undefined,
): ImageFields[] {
  if (!images || !Array.isArray(images)) return [];

  return images
    .map((edge) => mapShopifyImageToImageFields(edge.node))
    .filter((img): img is ImageFields => img !== null);
}
