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
    <header className="py-4">
      <div className="container mx-auto px-4">
        <div className=" w-full flex items-center justify-between md:grid md:grid-cols-3 md:justify-items-center">
          <Logo />
          <HamburgerMenu headerMenu={headerMenu} isLoggedIn={isLoggedIn} />
          <UserButtons className="md:ml-auto" />
        </div>
      </div>
    </header>
  );
};

export default Header;
