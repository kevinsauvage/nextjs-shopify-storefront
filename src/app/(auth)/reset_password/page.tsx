import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import AuthShell from '@/app/(auth)/_components/AuthShell';
import config from '@/config';
import seo from '@/data/seo';

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

  const resetUrl = `${reset_url}?syclid=${syclid}`;
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
