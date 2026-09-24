'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Heart,
  Home,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  Sparkles,
  User,
} from 'lucide-react';

const HamburgerMenu = ({
  headerMenu,
  pathname = '',
}: {
  headerMenu: GetMenuByHandleQuery['menu'] | null | undefined;
  pathname?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});
  const { isLoggedIn } = useUserContext();
  const router = useRouter();

  const toggleMenu = (id: string) => {
    setExpandedMenus((previous) => ({
      ...previous,
      [id]: !previous[id],
    }));
  };

  const quickLinks = [
    { Icon: Home, id: 'home', link: '/', text: 'Home' },
    { Icon: Search, id: 'search', link: config.routes.search, text: 'Search' },
    {
      Icon: User,
      id: 'account',
      link: isLoggedIn ? config.routes.account : config.routes.login,
      text: isLoggedIn ? 'Account' : 'Login',
    },
    { Icon: Heart, id: 'wishlist', link: config.routes.wishlist, text: 'Wishlist' },
    { Icon: ShoppingBag, id: 'cart', link: config.routes.cart, text: 'Cart' },
    ...(isLoggedIn
      ? [{ Icon: LogOut, id: 'logout', link: config.routes.logout, text: 'Logout' }]
      : []),
  ] as const;

  const menuItems = headerMenu?.items || [];

  const renderMenuItem = (item: MenuItem, level = 0, index = 0) => {
    const hasChildren = Boolean(item.items && item.items.length > 0);
    const isExpanded = Boolean(expandedMenus[item.id]);
    const href = typeof item.url === 'string' ? normalizeMenuHref(item.url) : null;

    const isActive =
      href !== null &&
      href.length > 0 &&
      (pathname === href || (href !== '/' && pathname.startsWith(`${href}/`)));

    if (level > 0) {
      return (
        <div key={item.id}>
          {href ? (
            <Link
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                'group flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-body-sm transition-all duration-200',
                isActive
                  ? 'border-[var(--gold)]/40 bg-[var(--gold-soft)] font-semibold text-foreground'
                  : 'border-transparent hover:border-border/70 hover:bg-muted/70',
              )}
            >
              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-1.5 rounded-full transition-colors',
                    isActive ? 'bg-[var(--gold)]' : 'bg-border group-hover:bg-[var(--gold)]/60',
                  )}
                />
                {item.title}
              </span>
              <ArrowUpRight
                size={15}
                aria-hidden="true"
                className="text-secondary transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
              />
            </Link>
          ) : null}
          {hasChildren && (
            <div className="mt-1 space-y-1 pl-4">
              {item.items.map((child, childIndex) =>
                renderMenuItem(child as MenuItem, level + 1, childIndex),
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={item.id}
        className="group/row overflow-hidden rounded-2xl border border-transparent transition-colors duration-200 hover:border-border/70 hover:bg-card"
      >
        <div className="flex items-stretch">
          <button
            type="button"
            aria-expanded={hasChildren ? isExpanded : undefined}
            onClick={() => {
              if (hasChildren) {
                toggleMenu(item.id);
              } else if (href) {
                router.push(href);
                setOpen(false);
              }
            }}
            className={cn(
              'flex min-h-[64px] flex-1 cursor-pointer items-center gap-4 px-4 py-3 text-left transition-colors',
              isActive && 'bg-[var(--gold-soft)]/60',
            )}
          >
            <span
              aria-hidden="true"
              className="w-7 shrink-0 font-display text-caption-sm tabular-nums text-secondary"
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="flex-1">
              <span
                className={cn(
                  'block font-display text-xl leading-tight transition-transform duration-200 group-hover/row:translate-x-0.5',
                  isActive ? 'text-foreground' : 'text-foreground/90',
                )}
              >
                {item.title}
              </span>
              {hasChildren && (
                <span className="mt-0.5 block text-caption text-secondary">
                  {item.items.length} collections
                  <span aria-hidden="true"> · </span>
                  {isExpanded ? 'Tap to collapse' : 'Tap to explore'}
                </span>
              )}
            </span>
          </button>
          <span className="flex items-center gap-2 pr-4">
            {isActive && (
              <span aria-hidden="true" className="size-2 rounded-full bg-[var(--gold)]" />
            )}
            {hasChildren ? (
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-9 items-center justify-center rounded-full border transition-all duration-300',
                  isExpanded
                    ? 'rotate-180 border-[var(--gold)]/40 bg-[var(--gold-soft)] text-[var(--gold)]'
                    : 'border-border/70 text-secondary group-hover/row:border-foreground/20 group-hover/row:text-foreground',
                )}
              >
                <ChevronDown size={16} />
              </span>
            ) : (
              <ArrowRight
                size={16}
                aria-hidden="true"
                className="text-secondary transition-all duration-200 group-hover/row:translate-x-1 group-hover/row:text-foreground"
              />
            )}
          </span>
        </div>

        <div
          className={cn(
            'grid transition-all duration-300 ease-out',
            isExpanded && hasChildren ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-1 px-4 pb-4 pl-[60px]">
              {hasChildren &&
                item.items.map((child, childIndex) =>
                  renderMenuItem(child as MenuItem, level + 1, childIndex),
                )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Open menu"
          type="button"
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border/70 bg-background/60 py-2 pl-3 pr-4 transition-all duration-200 hover:-translate-y-px hover:bg-muted hover:shadow-[0_10px_24px_-14px_rgb(12_10_9/0.5)]"
        >
          <Menu size={18} strokeWidth={1.75} />
          <span className="text-[13px] font-semibold tracking-wide">Menu</span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="hero-mesh flex max-h-dvh w-full flex-col gap-0 overflow-hidden border-r border-border/60 p-0 sm:max-w-md"
      >
        <SheetHeader className="relative shrink-0 gap-0 border-b border-border/60 p-0 text-left">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-16 -top-20 size-56 rounded-full bg-[var(--gold)]/10 blur-3xl" />
          </div>
          <div className="relative p-6 pb-5 pr-14">
            <span className="text-eyebrow-gold inline-flex items-center gap-2">
              <Sparkles size={13} aria-hidden="true" />
              Menu
            </span>
            <SheetTitle className="font-display mt-2 text-3xl font-medium tracking-tight">
              Shop categories
            </SheetTitle>
            <SheetDescription className="text-body-sm mt-1.5 text-secondary">
              Curated collections, new drops and timeless staples.
            </SheetDescription>
            <div className="mt-4 flex gap-2">
              <Button size="sm" asChild className="rounded-full" onClick={() => setOpen(false)}>
                <Link href={config.routes.collection}>
                  Shop all <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                asChild
                className="glass rounded-full"
                onClick={() => setOpen(false)}
              >
                <Link href={config.routes.search}>
                  <Search className="size-4" aria-hidden="true" /> Search
                </Link>
              </Button>
            </div>
          </div>
        </SheetHeader>

        <nav aria-label="Shop categories" className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {menuItems.length > 0 ? (
            <div className="space-y-2">
              {menuItems.map((item, index) => renderMenuItem(item as MenuItem, 0, index))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="text-body-sm font-medium">No categories yet</p>
              <p className="text-caption mt-1 text-secondary">
                Browse the full collection instead.
              </p>
              <Button
                size="sm"
                asChild
                className="mt-4 rounded-full"
                onClick={() => setOpen(false)}
              >
                <Link href={config.routes.collection}>Shop all products</Link>
              </Button>
            </div>
          )}
        </nav>

        <div className="glass shrink-0 border-t border-border/60 p-4">
          <div className="grid grid-cols-3 gap-2">
            {quickLinks.map(({ Icon, id, link, text }) => {
              const active = pathname === link;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    router.push(link);
                    setOpen(false);
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-caption font-medium transition-all duration-200',
                    active
                      ? 'border-[var(--gold)]/40 bg-[var(--gold-soft)] text-foreground'
                      : 'border-border/60 bg-background/70 text-secondary hover:-translate-y-px hover:text-foreground hover:shadow-[0_12px_24px_-16px_rgb(12_10_9/0.5)]',
                  )}
                >
                  <Icon
                    size={18}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className={cn(
                      'transition-colors',
                      active ? 'text-[var(--gold)]' : 'group-hover:text-foreground',
                    )}
                  />
                  {text}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-center text-caption text-secondary">
            Free shipping over $150 · 30-day returns
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

/**
 * Reads the route pathname (which suspends on routes with unknown dynamic
 * params under Cache Components) so callers can wrap it in `<Suspense>` and
 * keep the static shell — see `Header`.
 */
const HamburgerMenuWithPathname = ({
  headerMenu,
}: {
  headerMenu: GetMenuByHandleQuery['menu'] | null | undefined;
}) => {
  const pathname = usePathname();
  return <HamburgerMenu headerMenu={headerMenu} pathname={pathname} />;
};

export { HamburgerMenu as HamburgerMenuView };
export default HamburgerMenuWithPathname;
