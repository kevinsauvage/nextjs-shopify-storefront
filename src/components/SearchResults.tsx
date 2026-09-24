import Link from 'next/link';

import type { PredictiveSearchQuery } from '@/shopify/storefront';
import { formatPrice } from '@/utils/format';

import { Button } from './ui/button';
import OptimizedImage from './OptimizedImage';
import SectionTitle from './SectionTitle';

import { Search } from 'lucide-react';

type ProductSearchItem = {
  id: string;
  featuredImage?: {
    url?: string;
    src?: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  title?: string;
  handle?: string;
  priceRange?: { minVariantPrice: { amount: string; currencyCode: string } };
};

const Product = ({ product }: { product: ProductSearchItem }) => {
  const { featuredImage, title, handle, priceRange } = product;

  if (!featuredImage) return null;

  // featuredImage is already an Image type, not an edge
  const imageUrl = String(
    (featuredImage as { url?: string; src?: string }).url ||
      (featuredImage as { url?: string; src?: string }).src ||
      '',
  );
  const image = {
    altText: (featuredImage as { altText?: string | null }).altText ?? null,
    blurDataURL: '',
    height: (featuredImage as { height?: number | null }).height ?? null,
    large: imageUrl,
    medium: imageUrl,
    small: imageUrl,
    src: imageUrl,
    width: (featuredImage as { width?: number | null }).width ?? null,
  };

  if (!image.src) return null;

  return (
    <Link
      key={handle}
      href={`/collections/products/${handle}`}
      className="flex items-center gap-2 p-2 rounded hover:bg-muted overflow-hidden"
    >
      <Button asChild variant="ghost" className="w-full justify-start gap-3 rounded-none">
        <span>
          <OptimizedImage
            src={image.small}
            alt={image.altText || ''}
            width={48}
            height={48}
            quality={75}
            sizes="48px"
            className="rounded-lg aspect-square object-contain"
          />
          <div className="flex flex-col items-start">
            <span className="text-body font-semibold">{title}</span>

            {priceRange?.minVariantPrice && (
              <span className="text-body-sm text-secondary">
                {formatPrice(
                  priceRange.minVariantPrice.amount,
                  priceRange.minVariantPrice.currencyCode,
                )}
              </span>
            )}
          </div>
        </span>
      </Button>
    </Link>
  );
};

const Query = ({ query }: { query: { text: string } }) => {
  return (
    <Link
      key={query.text}
      href={`/search?searchQuery=${query.text}`}
      className="block hover:bg-muted px-2 rounded"
    >
      <Button
        asChild
        variant="ghost"
        className="w-full justify-start rounded-none text-body font-medium"
      >
        <span>
          <Search className="mr-2 h-4 w-4 text-secondary" />
          {query.text}
        </span>
      </Button>
    </Link>
  );
};

const SearchResults = ({
  results,
}: {
  results: PredictiveSearchQuery['predictiveSearch'] | null | undefined;
}) => {
  if (!results) {
    return null;
  }

  const resultsData = results as {
    products?: Array<{ id: string }>;
    queries?: Array<{ text: string }>;
  };
  const products = resultsData.products || [];
  const queries = resultsData.queries || [];

  if (products.length === 0 && queries.length === 0) {
    return null;
  }

  return (
    <div
      role="status"
      className="absolute border z-50 w-full mt-2 shadow-lg text-start overflow-hidden bg-background rounded-lg animate-fadeSlideDown"
    >
      <div className="p-2">
        {queries.length > 0 && (
          <>
            <SectionTitle className="px-4 pt-4 text-label-sm text-secondary">
              Suggestions
            </SectionTitle>
            <div className="pb-4">
              {queries.map((q) => (
                <Query key={q.text} query={{ text: q.text }} />
              ))}
            </div>
          </>
        )}

        {products.length > 0 && (
          <>
            <SectionTitle className="px-4 pt-4 text-label-sm text-secondary">Products</SectionTitle>
            <div className="pb-4">
              {products.map((product) => (
                <Product key={product.id} product={product as ProductSearchItem} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
