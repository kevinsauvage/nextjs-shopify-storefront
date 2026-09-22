import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import HomeSection from '@/app/_components/HomeSection';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';
import ProductDescription from '@/components/ProductDescription';
import ProductRecommendations from '@/components/ProductRecommendations';
import config from '@/config';
import { generateMetadata as generateMetadataUtil } from '@/lib/server/metadata';
import { breadcrumbJsonLd, productJsonLd } from '@/lib/server/structured-data';
import { storefrontSdk } from '@/shopify';

export const revalidate = 3600;

const STATIC_PARAMS_PAGE_SIZE = 250;

/**
 * Product lookup memoized for the lifetime of a single request. `generateMetadata`
 * and the page body both need the product, and without this they each issue the
 * same Shopify round-trip.
 */
const getProduct = cache(async (handle: string) => {
  const response = await storefrontSdk().getProductByHandle({
    handle,
    identifiers: [],
  });

  return response.product ?? null;
});

/**
 * Pre-render product pages so they are statically served and revalidated
 * instead of server-rendered on every request. Products added later are still
 * generated on demand and cached (dynamicParams defaults to true).
 */
export async function generateStaticParams(): Promise<Array<{ productSlug: string }>> {
  const params: Array<{ productSlug: string }> = [];
  let after: string | undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    // Sequential cursor pagination: each request depends on the previous cursor.
    // eslint-disable-next-line no-await-in-loop
    const { products } = await storefrontSdk().getProductsForSitemap({
      after,
      first: STATIC_PARAMS_PAGE_SIZE,
    });

    for (const edge of products.edges) {
      if (edge.node.handle) {
        params.push({ productSlug: edge.node.handle });
      }
    }

    hasNextPage = products.pageInfo.hasNextPage && Boolean(products.pageInfo.endCursor);
    after = products.pageInfo.endCursor ?? undefined;
  }

  return params;
}

type parametersType = {
  genre: string;
  collectionSlug: string;
  productSlug: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<parametersType>;
}): Promise<Metadata> {
  const { productSlug } = await params;

  const product = await getProduct(productSlug);

  if (!product) {
    return generateMetadataUtil({
      title: 'Product Not Found',
      description: 'Product not found',
      url: `/collections/products/${productSlug}`,
      noindex: true,
    });
  }

  const title = product.seo?.title || product.title || 'Product';
  const description = product.seo?.description || product.description || 'Product';

  return generateMetadataUtil({
    title,
    description,
    url: `/collections/products/${productSlug}`,
    type: 'website',
  });
}

type PageProperties = {
  params: Promise<parametersType>;
};

const ProductPage = async ({ params }: PageProperties) => {
  const parameters = await params;

  const product = await getProduct(parameters.productSlug);

  if (!product) {
    notFound();
  }

  const recommendations = await storefrontSdk().productRecommendations({
    identifiers: [],
    productId: product.id,
  });

  const title = product?.title;
  const hasRecommendations =
    recommendations?.productRecommendations && recommendations.productRecommendations.length > 0;

  const productUrl = `${config.routes.collection}/products/${product.handle}`;
  const collectionHandle = product.collections.edges[0]?.node.handle;
  const price = product.priceRange.minVariantPrice;

  const structuredData = [
    productJsonLd({
      name: product.title,
      description: product.seo?.description || product.description,
      url: productUrl,
      images: product.images.edges
        .map((edge) => edge.node.src || edge.node.url)
        .filter((image): image is string => Boolean(image)),
      sku: product.variants.edges[0]?.node.sku,
      brand: product.vendor,
      price: price?.amount,
      currency: price?.currencyCode,
      availableForSale: product.availableForSale,
    }),
    breadcrumbJsonLd([
      { name: 'Home', url: config.routes.home },
      { name: 'Collections', url: config.routes.collection },
      ...(collectionHandle
        ? [
            {
              name: collectionHandle.replace(/-/g, ' '),
              url: `${config.routes.collection}/${collectionHandle}`,
            },
          ]
        : []),
      { name: product.title, url: productUrl },
    ]),
  ];

  return (
    <div className="min-h-[calc(100vh-76px)]">
      <JsonLd data={structuredData} />
      <div className="border-b border-border/60 bg-secondary/30">
        <div className="container mx-auto px-4 py-3 md:px-6">
          <Breadcrumbs lastElement={title} />
        </div>
      </div>

      <section className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <ProductDescription product={product} isModal={false} />
      </section>

      {hasRecommendations ? (
        <section className="border-t border-border/60">
          <div className="container mx-auto px-4 py-12 md:px-6 md:py-16">
            <HomeSection eyebrow="Curated" title="You may also like">
              <ProductRecommendations recommendations={recommendations} />
            </HomeSection>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default ProductPage;
