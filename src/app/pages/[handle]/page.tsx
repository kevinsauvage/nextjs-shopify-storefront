import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import MainContent from '@/app/(legal)/_components/MainContent';
import PolicyFallback from '@/app/(legal)/_components/PolicyFallback';
import Breadcrumbs from '@/components/Breadcrumbs';
import PageBanner from '@/components/PageBanner';
import { generateMetadata as generateMetadataUtil } from '@/lib/server/metadata';
import { storefrontSdk } from '@/shopify';
import { sanitizeHtmlCached } from '@/utils/sanitize';

type PagesParams = {
  handle: string;
};

/** Shopify page handles are lowercase slugs (`about-us`); anything else 404s. */
const isValidPageHandle = (handle: string): boolean => /^[a-z0-9][a-z0-9-]*$/.test(handle);

const getPage = async (handle: string) => {
  if (!isValidPageHandle(handle)) return null;

  const response = await storefrontSdk().getPageByHandle({ handle });
  return response?.page ?? null;
};

export const generateMetadata = async ({
  params,
}: {
  params: Promise<PagesParams>;
}): Promise<Metadata> => {
  const { handle } = await params;
  const page = await getPage(handle);

  if (!page) return {};

  return generateMetadataUtil({
    title: page.seo?.title || page.title,
    description: page.seo?.description || page.bodySummary,
    url: `/pages/${page.handle}`,
  });
};

const ShopifyPage = async ({ params }: { params: Promise<PagesParams> }) => {
  const { handle } = await params;
  const page = await getPage(handle);

  if (!page) {
    notFound();
  }

  const pageHtml = await sanitizeHtmlCached(page.body);

  return (
    <div>
      <PageBanner title={page.title} description={page.bodySummary}>
        <Breadcrumbs lastElement={page.title} />
      </PageBanner>
      <MainContent>
        {pageHtml ? <div dangerouslySetInnerHTML={{ __html: pageHtml }} /> : <PolicyFallback />}
      </MainContent>
    </div>
  );
};

export default ShopifyPage;
