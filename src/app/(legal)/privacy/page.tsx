import type { Metadata } from 'next';

import Breadcrumbs from '@/components/Breadcrumbs';
import PageBanner from '@/components/PageBanner';
import config from '@/config';
import seo from '@/data/seo';
import { generateMetadata as generateMetadataUtil } from '@/lib/server/metadata';
import { storefrontSdk } from '@/shopify/index';
import { sanitizeHtml } from '@/utils/sanitize';

import MainContent from '../_components/MainContent';

export const metadata: Metadata = generateMetadataUtil({
  title: seo.pages.privacy.title,
  description: seo.pages.privacy.description,
  url: config.routes.privacy,
});

const PrivacyPage = async () => {
  const shopInfo = await storefrontSdk().getPrivacyPolicy({});
  const privacyPolicy = shopInfo?.shop.privacyPolicy;
  const { title, description } = seo.pages.privacy || {};
  const privacyHtml = sanitizeHtml(privacyPolicy?.body);

  return (
    <div>
      <PageBanner title={title} description={description}>
        <Breadcrumbs lastElement={title} />
      </PageBanner>
      <MainContent>
        {privacyHtml && <div dangerouslySetInnerHTML={{ __html: privacyHtml }} />}
      </MainContent>
    </div>
  );
};

export default PrivacyPage;
