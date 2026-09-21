import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

import AuthShell from '@/app/(auth)/_components/AuthShell';
import config from '@/config';
import seo from '@/data/seo';
import { generateMetadata as generateMetadataUtil } from '@/lib/server/metadata';

import LoginForm from './_components/LoginForm';

export const metadata: Metadata = generateMetadataUtil({
  title: seo.login.title,
  description: seo.login.description,
  url: config.routes.login,
  noindex: true, // Login page shouldn't be indexed
});

const LoginPage = () => {
  const { title, description } = seo.login || {};
  return (
    <AuthShell
      title={title}
      description={description}
      footer={
        <div className="pt-4 space-y-3 text-body-sm text-center text-secondary">
          <div>
            Don&apos;t have an account?{' '}
            <Link href={config.routes.register} className="link">
              Sign up
            </Link>
          </div>
          <div>
            <Link href={config.routes.emailResetPassword} className="link">
              Forgot password?
            </Link>
          </div>
        </div>
      }
    >
      <Suspense fallback={<div className="h-64" aria-hidden="true" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
};

export default LoginPage;
