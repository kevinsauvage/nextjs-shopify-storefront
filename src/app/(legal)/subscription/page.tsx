import type { Metadata } from 'next';

import Breadcrumbs from '@/components/Breadcrumbs';
import PageBanner from '@/components/PageBanner';
import config from '@/config';
import seo from '@/data/seo';
import { generateMetadata as generateMetadataUtil } from '@/lib/server/metadata';
import { storefrontSdk } from '@/shopify/index';
import { sanitizeHtmlCached } from '@/utils/sanitize';

import MainContent from '../_components/MainContent';
import PolicyFallback from '../_components/PolicyFallback';

export const metadata: Metadata = generateMetadataUtil({
  title: seo.pages.subscription.title,
  description: seo.pages.subscription.description,
  url: config.routes.subscription,
});

const SubscriptionPage = async () => {
  const response = await storefrontSdk().getSubscriptionPolicy({});
  const { subscriptionPolicy } = response?.shop || {};
  const { title, description } = seo.pages.subscription || {};
  const subscriptionHtml = await sanitizeHtmlCached(subscriptionPolicy?.body);
  return (
    <div>
      <PageBanner title={title} description={description}>
        <Breadcrumbs lastElement={title} />
      </PageBanner>
      <MainContent>
        {subscriptionHtml ? (
          <div dangerouslySetInnerHTML={{ __html: subscriptionHtml }} />
        ) : (
          <PolicyFallback />
        )}
      </MainContent>
    </div>
  );
};

export default SubscriptionPage;
