'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import config from '@/config';
import type { GetMenuByHandleQuery } from '@/shopify/storefront';
import { cn } from '@/utils/cn';
import { normalizeMenuHref } from '@/utils/url';

type MenuItems = NonNullable<GetMenuByHandleQuery['menu']>['items'];
type MenuItem = MenuItems[number];

/** Returns a navigable href, or null for placeholder anchors (`#`, empty). */
const resolveHref = (url?: string | null): string | null => {
  const href = normalizeMenuHref(url).trim();
  if (!href || href === '#' || href === '/#') return null;
  return href;
};

const isActivePath = (pathname: string, href: string): boolean =>
  href === config.routes.home
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

const triggerClass = (active: boolean) =>
  cn(
    navigationMenuTriggerStyle(),
    'text-body-sm font-medium bg-transparent hover:bg-muted focus:bg-muted data-[state=open]:bg-muted',
    active ? 'text-foreground' : 'text-secondary hover:text-foreground',
  );

const DesktopNav = ({ items, pathname = '' }: { items: MenuItems; pathname?: string }) => {
  return (
    <NavigationMenu className="hidden lg:flex" viewport={false}>
      <NavigationMenuList className="gap-0.5">
        <NavigationMenuItem>
          <NavigationMenuLink asChild active={pathname === config.routes.home}>
            <Link
              href={config.routes.home}
              className={triggerClass(pathname === config.routes.home)}
            >
              Home
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>

        {items.map((item: MenuItem) => {
          const href = resolveHref(item.url);
          const children = (item.items ?? []).filter((child) => resolveHref(child.url));
          const active = href ? isActivePath(pathname, href) : false;

          if (children.length === 0) {
            return (
              <NavigationMenuItem key={item.id}>
                <NavigationMenuLink asChild active={active}>
                  <Link href={href ?? config.routes.collection} className={triggerClass(active)}>
                    {item.title}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            );
          }

          return (
            <NavigationMenuItem key={item.id}>
              <NavigationMenuTrigger className={triggerClass(active)}>
                {item.title}
              </NavigationMenuTrigger>
              <NavigationMenuContent className="absolute top-full left-0 mt-1 !w-[15rem] rounded-2xl border border-border/60 bg-popover p-2 shadow-[0_24px_60px_-30px_rgb(12_10_9/0.45)]">
                <ul className="grid gap-0.5">
                  {children.map((child) => {
                    const childHref = resolveHref(child.url) as string;
                    const childActive = isActivePath(pathname, childHref);
                    return (
                      <li key={child.id}>
                        <NavigationMenuLink asChild active={childActive}>
                          <Link
                            href={childHref}
                            className="rounded-xl px-3.5 py-2.5 text-body-sm text-secondary"
                          >
                            {child.title}
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    );
                  })}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
};

/**
 * Reads the route pathname (which suspends on routes with unknown dynamic
 * params under Cache Components) so callers can wrap it in `<Suspense>` and
 * keep the static shell — see `Header`.
 */
const DesktopNavWithPathname = ({ items }: { items: MenuItems }) => {
  const pathname = usePathname();
  return <DesktopNav items={items} pathname={pathname} />;
};

export { DesktopNav as DesktopNavView };
export default DesktopNavWithPathname;
