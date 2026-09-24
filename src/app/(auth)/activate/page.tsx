import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import AuthShell from '@/app/(auth)/_components/AuthShell';
import config from '@/config';
import seo from '@/data/seo';
import { isAllowedPasswordResetUrl } from '@/utils/url';

import ActivateForm from './_components/ActivateForm';

export const metadata: Metadata = {
  description: seo.activate.description,
  title: seo.activate.title,
  robots: { index: false, follow: false },
};

const ActivatePage = async ({
  searchParams,
}: {
  searchParams: Promise<{
    activation_url: string;
    syclid?: string;
  }>;
}) => {
  const searchParameters = await searchParams;
  const { activation_url, syclid } = searchParameters;

  if (!activation_url) {
    redirect(config.routes.login);
  }

  // Rebuild the activation URL with the URL API so a crafted `syclid` cannot
  // inject extra query params. Activation links carry their token in the path,
  // so `syclid` is optional here (unlike the password-reset flow).
  let activationUrl: string;
  try {
    const url = new URL(activation_url);
    if (syclid) url.searchParams.set('syclid', syclid);
    activationUrl = url.toString();
  } catch {
    redirect(config.routes.login);
  }

  // Never render the form (or forward the URL to `customerActivateByUrl`) for
  // a link outside the store-owned origins: a crafted `activation_url` could
  // otherwise drive the victim's activation flow from a lookalike host.
  if (!isAllowedPasswordResetUrl(activationUrl)) {
    redirect(config.routes.login);
  }

  const { title, description } = seo.activate || {};

  return (
    <AuthShell
      title={title}
      description={description}
      footer={
        <div className="pt-4 text-body-sm text-center text-secondary">
          <Link href={config.routes.login} className="link">
            Back to login
          </Link>
        </div>
      }
    >
      <ActivateForm activationUrl={activationUrl} />
    </AuthShell>
  );
};

export default ActivatePage;
