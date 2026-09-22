import Breadcrumbs from '@/components/Breadcrumbs';
import { Card } from '@/components/ui/card';

import AccountNavigation from './_components/AccountNavigation';
import AccountNavigationSheet from './_components/AccountNavigationSheet';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
      <header className="mb-8 border-b border-border pb-8 md:mb-10">
        <Breadcrumbs />
        <div className="mt-6 flex flex-col gap-3">
          <span className="text-eyebrow">Members</span>
          <h1 className="text-balance">Your account</h1>
          <p className="text-body-lg max-w-2xl text-secondary">
            Manage your personal details, track orders, and keep your saved addresses and wishlist
            up to date — all in one place.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4 md:gap-8">
        <aside className="hidden md:block">
          <div className="sticky top-24">
            <Card className="p-2">
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
  );
};

export default Layout;
