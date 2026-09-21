import Logo from '@/components/Logo';
import UserButtons from '@/components/UserButtons';
import type { GetMenuByHandleQuery } from '@/shopify/storefront';

import HamburgerMenu from './HamburgerMenu';

const Header = ({
  headerMenu,
  isLoggedIn,
}: {
  headerMenu: GetMenuByHandleQuery['menu'] | null | undefined;
  isLoggedIn: boolean;
}) => {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 w-full items-center justify-between gap-4 md:grid md:grid-cols-3 md:items-center md:justify-items-center md:h-20">
          <Logo />
          <HamburgerMenu headerMenu={headerMenu} isLoggedIn={isLoggedIn} />
          <UserButtons className="md:ml-auto" />
        </div>
      </div>
    </header>
  );
};

export default Header;
