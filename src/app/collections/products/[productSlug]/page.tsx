import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import HomeSection from '@/app/_components/HomeSection';
import Breadcrumbs from '@/components/Breadcrumbs';
import ProductDescription from '@/components/ProductDescription';
import ProductRecommendations from '@/components/ProductRecommendations';
import { generateMetadata as generateMetadataUtil } from '@/lib/server/metadata';
import { storefrontSdk } from '@/shopify/index';

export const revalidate = 3600;

const STATIC_PARAMS_PAGE_SIZE = 250;

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

  const productResponse = await storefrontSdk().getProductSeoByHandle({
    handle: productSlug,
  });

  const { product } = productResponse;

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

  const productResponse = await storefrontSdk().getProductByHandle({
    handle: parameters.productSlug,
    identifiers: [],
  });

  const { product } = productResponse;

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

  return (
    <div className="min-h-[calc(100vh-76px)]">  
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <Breadcrumbs lastElement={title} />
      </div>

      <section className="container mx-auto px-4 md:px-6 pb-8 md:pb-12">
        <ProductDescription product={product} isModal={false} />
      </section>

      {hasRecommendations && (
        <section className="container mx-auto px-4 md:px-6 pb-12 md:pb-16">
          <HomeSection title="Recommended Products">
            <ProductRecommendations recommendations={recommendations} />
          </HomeSection>
        </section>
      )}
    </div>
  );
};

export default ProductPage;
