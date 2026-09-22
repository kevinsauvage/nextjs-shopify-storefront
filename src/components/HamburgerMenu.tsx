'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import config from '@/config/index';
import useUserContext from '@/contexts/UserContext/useUserContext';
import type { GetMenuByHandleQuery, MenuItem } from '@/shopify/storefront';
import { cn } from '@/utils/cn';
import { normalizeMenuHref } from '@/utils/url';

import {
  ChevronDown,
  ChevronRight,
  Heart,
  Home,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  User,
} from 'lucide-react';

const HamburgerMenu = ({
  headerMenu,
}: {
  headerMenu: GetMenuByHandleQuery['menu'] | null | undefined;
}) => {
  const [open, setOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});
  const { isLoggedIn } = useUserContext();
  const router = useRouter();
  const pathname = usePathname();

  const toggleMenu = (id: string) => {
    setExpandedMenus((previous) => ({
      ...previous,
      [id]: !previous[id],
    }));
  };

  const userMenuItems = [
    { icon: <Home className="text-secondary group-hover:text-primary transition-colors" />, id: 'home', link: '/', text: 'Home' },
    { icon: <Search className="text-secondary group-hover:text-primary transition-colors" />, id: 'search', link: config.routes.search, text: 'Search' },

    {
      icon: <User className="text-secondary group-hover:text-primary transition-colors" />,
      id: 'account',
      link: isLoggedIn ? config.routes.account : config.routes.login,
      text: isLoggedIn ? 'Account' : 'Login',
    },
    { icon: <Heart className="text-secondary group-hover:text-primary transition-colors" />, id: 'wishlist', link: config.routes.wishlist, text: 'Wishlist' },
    { icon: <ShoppingBag className="text-secondary group-hover:text-primary transition-colors" />, id: 'cart', link: config.routes.cart, text: 'Cart' },
    isLoggedIn && {
      icon: <LogOut className="text-secondary group-hover:text-primary transition-colors" />,
      id: 'logout',
      link: config.routes.logout,
      text: 'Logout',
    },
  ];

  const menuItems = headerMenu?.items || [];

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.items && item.items.length > 0;
    const isExpanded = expandedMenus[item.id];

    return (
      <div key={item.id} className={`width-full`}>
        <button
          className={cn(
            'flex w-full cursor-pointer items-center justify-between px-4 py-2 text-body-sm',
            level === 0 ? 'font-medium' : '',
            'hover:bg-muted hover:text-foreground',
            isExpanded ? 'bg-muted text-foreground' : '',
            pathname === normalizeMenuHref(item.url) ? 'border' : '',
          )}
          style={{ paddingLeft: `${level * 12 + 16}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleMenu(item.id);
            } else if (typeof item.url === 'string') {
              router.push(normalizeMenuHref(item.url));
              setOpen(false);
            }
          }}
        >
          <span>{item.title}</span>
          {hasChildren && (
            <span className="text-secondary group-hover:text-primary transition-colors">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          )}
        </button>

        {hasChildren && isExpanded && (
          <div className="mt-1">{item.items.map((child) => renderMenuItem(child, level + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button aria-label="Open menu" type="button" className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-border/70 bg-background/60 transition-colors hover:bg-muted">
          <Menu size={20} strokeWidth={1.75} />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-full sm:max-w-md overflow-scroll max-h-dvh">
        <div className="flex h-full flex-col">
          <SheetHeader className="p-5">
            <SheetTitle className="text-heading-4">Shop Categories</SheetTitle>
            <SheetDescription className="text-body-sm text-secondary">
              Explore our wide range of products and categories.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-auto py-2">
            {menuItems.map((item) => renderMenuItem(item as MenuItem))}
          </div>
        </div>
        <SheetFooter className="border-t">
          {userMenuItems.map((item) => {
            if (!item) return null;
            return (
              <button
                key={item.id}
                className={cn(
                  'group flex w-full cursor-pointer items-center justify-between rounded-md px-4 py-2 text-body-sm hover:bg-muted/50',
                  pathname === item.link ? 'bg-muted text-foreground' : '',
                )}
                onClick={() => {
                  router.push(item.link);
                  setOpen(false);
                }}
              >
                <span className="flex items-center gap-2">
                  {item.icon}
                  {item.text}
                </span>
              </button>
            );
          })}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default HamburgerMenu;
