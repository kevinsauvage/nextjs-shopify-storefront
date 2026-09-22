import type { Metadata } from 'next';

import CollectionGrid from '@/components/CollectionGrid/CollectionGrid';
import PageBanner from '@/components/PageBanner';
import seo from '@/data/seo';
import { generateMetadata as generateMetadataUtil } from '@/lib/server/metadata';
import { storefrontSdk } from '@/shopify/index';
import { CollectionSortKeys, ProductSortKeys } from '@/shopify/storefront/index';

import HomeSection from './_components/HomeSection';
import ProductSection from './_components/ProductSection';

export const revalidate = 3600; // 1 hour

export const metadata: Metadata = generateMetadataUtil({
  title: seo.home.title,
  description: seo.home.description,
  url: '/',
  absoluteTitle: true,
});

const Home = async () => {
  const [collections, bestSelling, newArrival] = await Promise.all([
    storefrontSdk().collections({
      first: 100,
      firstProducts: 1,
      identifiers: [{ key: 'featured', namespace: 'custom' }],
      sortKey: CollectionSortKeys?.Relevance,
    }),
    storefrontSdk().getProducts({
      first: 8,
      identifiers: [],
      sortKey: ProductSortKeys.BestSelling,
    }),
    storefrontSdk().getProducts({
      first: 8,
      identifiers: [],
      sortKey: ProductSortKeys.CreatedAt,
    }),
  ]);

  const featuredCollections = collections.collections.edges.filter((collection) =>
    collection.node.metafields.find((metafield) => metafield?.key === 'featured'),
  );

  const bestSellingProducts = bestSelling.products.edges.map((edge) => edge.node);
  const newArrivalProducts = newArrival.products.edges.map((edge) => edge.node);

  return (
    <div className="pb-16 md:pb-24">
      <PageBanner
        eyebrow="New Season"
        title="Shop the Latest Trends"
        description="Discover the latest trends and exclusive collections that will elevate your style. Shop now and enjoy a seamless shopping experience with us. From fashion to home decor, we have something for everyone."
      />

      {featuredCollections.length > 0 && (
        <div className="container mx-auto px-4 md:px-6">
          <HomeSection eyebrow="Curated" title="Explore our collections">
            <CollectionGrid collections={featuredCollections} />
          </HomeSection>
        </div>
      )}

      <div className="container mx-auto space-y-4 px-4 md:space-y-8 md:px-6">
        {bestSellingProducts.length > 0 && (
          <ProductSection
            eyebrow="Best Sellers"
            title="Featured Products"
            products={bestSellingProducts}
            viewAllLabel="View all featured"
          />
        )}

        {newArrivalProducts.length > 0 && (
          <ProductSection
            eyebrow="Just In"
            title="New Arrivals"
            products={newArrivalProducts}
            viewAllLabel="View all new arrivals"
          />
        )}
      </div>
    </div>
  );
};

export default Home;
