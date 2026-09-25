'use client';

import type { Route } from 'next';
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
import { cn } from '@/utils/cn';
import { normalizeMenuHref } from '@/utils/url';

import { ArrowRight } from 'lucide-react';

/**
 * Structural, recursive view of a Shopify menu item. The generated
 * `GetMenuByHandleQuery` types each nesting level separately (and the leaf
 * level has no `items` property), so helpers use this single shape instead.
 */
type NavItem = {
  id: string;
  title: string;
  url?: string | null;
  items?: readonly NavItem[];
};

type NavItems = readonly NavItem[];

/** Returns a navigable href, or null for placeholder anchors (`#`, empty). */
const resolveHref = (url?: string | null): Route | null => {
  const href = normalizeMenuHref(url).trim();
  if (!href || href === '#' || href === '/#') return null;
  return href as Route;
};

const isActivePath = (pathname: string, href: string): boolean =>
  href === config.routes.home
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

/**
 * Children that resolve to a navigable href, excluding any that points back at
 * the item itself. A merchant can nest an "All X" link that duplicates the
 * category heading; since the heading is already a link, rendering it twice
 * would show the same destination under two labels.
 */
const navigableChildren = (item: NavItem): NavItem[] => {
  const ownHref = resolveHref(item.url);
  return (item.items ?? []).filter((child) => {
    const href = resolveHref(child.url);
    return href !== null && href !== ownHref;
  });
};

/** An item is expandable when it has at least one navigable child. */
const hasNavigableChildren = (item: NavItem): boolean => navigableChildren(item).length > 0;

const triggerClass = (active: boolean) =>
  cn(
    navigationMenuTriggerStyle(),
    'bg-transparent text-body-sm font-medium hover:bg-muted focus:bg-muted data-[state=open]:bg-muted',
    active ? 'text-foreground' : 'text-secondary hover:text-foreground',
  );

/** Shared heading style so every mega column title sits on the same baseline. */
const megaHeadingClass = (active: boolean) =>
  cn(
    'font-display block text-base leading-tight transition-colors hover:text-[var(--gold-strong)]',
    active ? 'text-[var(--gold-strong)]' : 'text-foreground',
  );

/** Muted dot marking a link inside the mega menu; gold when the route is active. */
const Dot = ({ active }: { active: boolean }) => (
  <span
    aria-hidden="true"
    className={cn(
      'size-1.5 shrink-0 rounded-full transition-colors',
      active ? 'bg-[var(--gold)]' : 'bg-border group-hover/link:bg-[var(--gold)]/60',
    )}
  />
);

type LinkListProps = {
  items: readonly NavItem[];
  pathname: string;
};

/** Renders the child links of a single mega column. */
const MegaLinkList = ({ items, pathname }: LinkListProps) => (
  <ul className="mt-3 space-y-1">
    {items.map((item) => {
      const href = resolveHref(item.url) as Route;
      const active = isActivePath(pathname, href);
      return (
        <li key={item.id}>
          <Link
            href={href}
            className={cn(
              'group/link -mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-body-sm transition-colors',
              active
                ? 'bg-muted/60 text-foreground'
                : 'text-secondary hover:bg-muted/60 hover:text-foreground',
            )}
          >
            <Dot active={active} />
            <span className="truncate">{item.title}</span>
          </Link>
        </li>
      );
    })}
  </ul>
);

/**
 * One column per category that has sub-items. The heading is the category link
 * (baseline-aligned with every other column) followed by its sub-links.
 */
const MegaColumn = ({ item, pathname }: { item: NavItem; pathname: string }) => {
  const href = resolveHref(item.url);
  const active = href ? isActivePath(pathname, href) : false;
  const children = navigableChildren(item);

  return (
    <div className="min-w-0">
      {href ? (
        <Link href={href} className={megaHeadingClass(active)}>
          {item.title}
        </Link>
      ) : (
        <span className={megaHeadingClass(false)}>{item.title}</span>
      )}
      <MegaLinkList items={children} pathname={pathname} />
    </div>
  );
};

/**
 * Groups the categories that have no sub-items into a single trailing column, so
 * the deep categories stay together on the left and the shallow ones stay
 * together on the right.
 */
const MegaGroup = ({ label, items, pathname }: { label: string } & LinkListProps) => (
  <div className="min-w-0">
    <span className={megaHeadingClass(false)}>{label}</span>
    <MegaLinkList items={items} pathname={pathname} />
  </div>
);

/**
 * Wide panel for a top-level item with a deep branch. Cats with sub-items render
 * first as their own columns; the remaining categories are collected into one
 * trailing column. The parent's own URL provides the "shop everything" footer
 * link. The panel only renders entries owned by the Shopify menu.
 */
const MegaMenu = ({ item, pathname }: { item: NavItem; pathname: string }) => {
  const children = navigableChildren(item);
  const columns = children.filter((child) => hasNavigableChildren(child));
  const shallow = children.filter((child) => !hasNavigableChildren(child));
  const gridCount = columns.length + (shallow.length > 0 ? 1 : 0);
  const shopAll = resolveHref(item.url);

  return (
    <NavigationMenuContent className="w-auto p-0 pr-0 md:w-[min(60rem,calc(100vw-2rem))]">
      <div
        className="grid gap-x-6 gap-y-8 p-6"
        style={{ gridTemplateColumns: `repeat(${gridCount}, minmax(0, 1fr))` }}
      >
        {columns.map((child) => (
          <MegaColumn key={child.id} item={child} pathname={pathname} />
        ))}
        {shallow.length > 0 && <MegaGroup label="More" items={shallow} pathname={pathname} />}
      </div>
      {shopAll && (
        <div className="border-t border-border/60 bg-muted/40 px-6 py-3">
          <Link
            href={shopAll}
            className="group/link inline-flex items-center gap-1.5 text-body-sm font-medium text-foreground transition-colors hover:text-[var(--gold-strong)]"
          >
            Shop all
            <ArrowRight
              size={14}
              aria-hidden="true"
              className="transition-transform group-hover/link:translate-x-0.5"
            />
          </Link>
        </div>
      )}
    </NavigationMenuContent>
  );
};

/** Compact dropdown for an item whose children are all leaf links. */
const CompactMenu = ({ item, pathname }: { item: NavItem; pathname: string }) => {
  const children = navigableChildren(item);
  const shopAll = resolveHref(item.url);

  return (
    <NavigationMenuContent className="w-auto p-2 md:w-60">
      <ul className="grid gap-0.5">
        {children.map((child) => {
          const href = resolveHref(child.url) as Route;
          const active = isActivePath(pathname, href);
          return (
            <li key={child.id}>
              <NavigationMenuLink asChild active={active}>
                <Link href={href} className="rounded-xl px-3.5 py-2.5 text-body-sm text-secondary">
                  {child.title}
                </Link>
              </NavigationMenuLink>
            </li>
          );
        })}
      </ul>
      {shopAll && (
        <div className="mt-1 border-t border-border/60 pt-1">
          <NavigationMenuLink asChild>
            <Link
              href={shopAll}
              className="flex-row items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-body-sm font-medium text-[var(--gold-strong)]"
            >
              Shop all <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </NavigationMenuLink>
        </div>
      )}
    </NavigationMenuContent>
  );
};

const DesktopNav = ({ items, pathname = '' }: { items: NavItems; pathname?: string }) => {
  return (
    <NavigationMenu
      className="hidden lg:flex"
      viewportClassName="rounded-2xl border-border/60 shadow-[0_24px_60px_-30px_rgb(12_10_9/0.45)]"
    >
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

        {items.map((item: NavItem) => {
          const href = resolveHref(item.url);
          const children = navigableChildren(item);
          const active = href ? isActivePath(pathname, href) : false;
          const branchActive =
            active ||
            children.some((child) => {
              const childHref = resolveHref(child.url);
              return childHref ? isActivePath(pathname, childHref) : false;
            });

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

          const isMega = children.some((child) => hasNavigableChildren(child));

          return (
            <NavigationMenuItem key={item.id}>
              <NavigationMenuTrigger className={triggerClass(branchActive)}>
                {item.title}
              </NavigationMenuTrigger>
              {isMega ? (
                <MegaMenu item={item} pathname={pathname} />
              ) : (
                <CompactMenu item={item} pathname={pathname} />
              )}
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
const DesktopNavWithPathname = ({ items }: { items: NavItems }) => {
  const pathname = usePathname();
  return <DesktopNav items={items} pathname={pathname} />;
};

export { DesktopNav as DesktopNavView };
export default DesktopNavWithPathname;
