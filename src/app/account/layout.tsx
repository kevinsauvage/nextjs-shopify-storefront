import Breadcrumbs from '@/components/Breadcrumbs';
import { Card } from '@/components/ui/card';

import AccountNavigation from './_components/AccountNavigation';
import AccountNavigationSheet from './_components/AccountNavigationSheet';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="hero-mesh border-b border-border/60">
      <div className="container mx-auto px-4 py-10 md:px-6 md:py-14">
        <header className="mb-8 md:mb-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-3">
            <span className="text-eyebrow-gold inline-flex items-center gap-3">
              <span aria-hidden="true" className="h-px w-8 bg-[var(--gold)]/60" />
              Members
            </span>
            <h1 className="text-balance">Your account</h1>
            <p className="text-body-lg max-w-2xl text-secondary">
              Manage your personal details, track orders, and keep your saved addresses and wishlist
              up to date — all in one place.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4 md:gap-8">
          <aside className="hidden md:block">
            <div className="sticky top-32">
              <Card className="border-border/70 bg-card/90 p-2 shadow-[0_18px_44px_-24px_rgb(12_10_9/0.3)] backdrop-blur">
                <AccountNavigation />
              </Card>
            </div>
          </aside>

          <div className="w-full md:hidden">
            <AccountNavigationSheet />
          </div>

          <div className="min-w-0 md:col-span-3">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
