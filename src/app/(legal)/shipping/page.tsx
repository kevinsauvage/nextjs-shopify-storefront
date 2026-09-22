import type { Metadata } from 'next';

import Breadcrumbs from '@/components/Breadcrumbs';
import PageBanner from '@/components/PageBanner';
import config from '@/config';
import seo from '@/data/seo';
import { generateMetadata as generateMetadataUtil } from '@/lib/server/metadata';
import { storefrontSdk } from '@/shopify';
import { sanitizeHtml } from '@/utils/sanitize';

import MainContent from '../_components/MainContent';

export const metadata: Metadata = generateMetadataUtil({
  title: seo.pages.shipping.title,
  description: seo.pages.shipping.description,
  url: config.routes.shipping,
});
const ShippingPage = async () => {
  const response = await storefrontSdk().getShippingPolicy({});
  const { shippingPolicy } = response?.shop || {};
  const { title, description } = seo.pages.shipping || {};
  const shippingHtml = sanitizeHtml(shippingPolicy?.body);

  return (
    <div>
      <PageBanner title={title} description={description}>
        <Breadcrumbs lastElement={title} />
      </PageBanner>
      <MainContent>
        {shippingHtml && <div dangerouslySetInnerHTML={{ __html: shippingHtml }} />}
      </MainContent>
    </div>
  );
};

export default ShippingPage;
