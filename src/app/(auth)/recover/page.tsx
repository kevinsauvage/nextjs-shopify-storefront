import type { Metadata } from 'next';
import Link from 'next/link';

import AuthShell from '@/app/(auth)/_components/AuthShell';
import config from '@/config';
import seo from '@/data/seo';

import RecoverForm from './_components/RecoverForm';

export const metadata: Metadata = {
  description: seo.recover.description,
  title: seo.recover.title,
  robots: { index: false, follow: false },
};

const ResetPassword = () => {
  const { title, description } = seo.recover || {};
  return (
    <AuthShell
      title={title}
      description={description}
      footer={
        <div className="pt-4 text-body-sm text-center text-secondary">
          Remembered your password?{' '}
          <Link href={config.routes.login} className="link">
            Back to login
          </Link>
        </div>
      }
    >
      <RecoverForm />
    </AuthShell>
  );
};

export default ResetPassword;
