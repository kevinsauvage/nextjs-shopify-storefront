import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import AuthShell from '@/app/(auth)/_components/AuthShell';
import config from '@/config';
import seo from '@/data/seo';
import { isAllowedPasswordResetUrl } from '@/utils/url';

import ResetForm from './_components/ResetPasswordForm';

export const metadata: Metadata = {
  description: seo.reset.description,
  title: seo.reset.title,
  robots: { index: false, follow: false },
};

const ResetPasswordPage = async ({
  searchParams,
}: {
  searchParams: Promise<{
    reset_url: string;
    syclid: string;
  }>;
}) => {
  const searchParameters = await searchParams;
  const { reset_url, syclid } = searchParameters;

  if (!reset_url || !syclid) {
    redirect(config.routes.login);
  }

  // Build the reset URL with the URL API so a crafted `syclid` cannot inject
  // extra query params (or break the link when `reset_url` already has its own).
  // An unparseable `reset_url` bounces to login via the allowlist check below.
  let resetUrl: string;
  try {
    const url = new URL(reset_url);
    url.searchParams.set('syclid', syclid);
    resetUrl = url.toString();
  } catch {
    redirect(config.routes.login);
  }

  // Never render the form (or forward the URL to `customerResetByUrl`) for a
  // reset link outside the store-owned origins: a crafted `reset_url` could
  // otherwise drive the victim's reset flow from a lookalike host.
  if (!isAllowedPasswordResetUrl(resetUrl)) {
    redirect(config.routes.login);
  }
  const { title, description } = seo.reset || {};

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
      <ResetForm resetUrl={resetUrl} />
    </AuthShell>
  );
};

export default ResetPasswordPage;
