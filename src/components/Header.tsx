import Link from 'next/link';

import Logo from '@/components/Logo';
import UserButtons from '@/components/UserButtons';
import config from '@/config';
import type { GetMenuByHandleQuery } from '@/shopify/storefront';
import { normalizeMenuHref } from '@/utils/url';

import HamburgerMenu from './HamburgerMenu';

import { Truck } from 'lucide-react';

const Header = ({ headerMenu }: { headerMenu: GetMenuByHandleQuery['menu'] | null | undefined }) => {
  const navItems = (headerMenu?.items ?? []).slice(0, 5);

  return (
    <>
      <div className="bg-primary text-primary-foreground">
        <p className="container mx-auto flex items-center justify-center gap-2 px-4 py-2 text-center text-[12px] font-medium tracking-[0.08em] uppercase">
          <Truck size={14} strokeWidth={1.75} aria-hidden="true" />
          Complimentary shipping on orders over $150 · Easy 30-day returns
        </p>
      </div>
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex h-16 w-full items-center justify-between gap-3 md:h-[72px]">
            <div className="flex items-center gap-2">
              <HamburgerMenu headerMenu={headerMenu} />
              <Logo />
            </div>
            <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
              <Link
                href={config.routes.home}
                className="link-underline text-body-sm font-medium text-secondary transition-colors hover:text-foreground"
              >
                Home
              </Link>
              {navItems.map((item) =>
                typeof item.url === 'string' ? (
                  <Link
                    key={item.id}
                    href={normalizeMenuHref(item.url)}
                    className="link-underline text-body-sm font-medium text-secondary transition-colors hover:text-foreground"
                  >
                    {item.title}
                  </Link>
                ) : null,
              )}
              <Link
                href={config.routes.collection}
                className="link-underline text-body-sm font-medium text-secondary transition-colors hover:text-foreground"
              >
                Shop all
              </Link>
            </nav>
            <UserButtons />
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
