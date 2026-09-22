'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { accountNav } from '@/config';
import { cn } from '@/utils/cn';

import { BookText, BookUser, Heart, LogOut, type LucideIcon, Package, User } from 'lucide-react';

const linkIcons: Record<string, LucideIcon> = {
  'Account overview': User,
  'Address book': BookUser,
  'My details': BookText,
  'My orders': Package,
  'My wishlist': Heart,
  'Sign out': LogOut,
};

type NavLink = (typeof accountNav)[number];

const AccountNavigation = ({ handleClose }: { handleClose?: () => void }) => {
  const currentPathname = usePathname();

  const mainLinks = accountNav.filter((link) => link.title !== 'Sign out');
  const signOutLink = accountNav.find((link) => link.title === 'Sign out');

  const renderLink = (link: NavLink, isSignOut = false) => {
    const Icon = linkIcons[link.title];
    const isActive = !isSignOut && currentPathname === link.url;

    return (
      <Link
        key={link.url}
        href={link.url}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => {
          handleClose?.();
        }}
        className={cn(
          'group flex min-h-11 items-center gap-3 rounded-lg px-3 text-body-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          isSignOut
            ? 'text-secondary hover:bg-destructive/10 hover:text-destructive'
            : isActive
              ? 'bg-foreground text-background'
              : 'text-foreground hover:bg-muted',
        )}
      >
        {Icon ? (
          <Icon
            size={18}
            className={cn(
              'shrink-0 transition-colors',
              isSignOut
                ? 'text-secondary group-hover:text-destructive'
                : isActive
                  ? 'text-background'
                  : 'text-secondary group-hover:text-foreground',
            )}
          />
        ) : null}
        <span className="truncate">{link.title}</span>
      </Link>
    );
  };

  return (
    <nav aria-label="Account" className="flex flex-col gap-1 p-1">
      <p className="text-eyebrow px-3 pb-2">Account</p>
      {mainLinks.map((link) => renderLink(link))}
      {signOutLink && (
        <div className="mt-2 border-t border-border pt-2">{renderLink(signOutLink, true)}</div>
      )}
    </nav>
  );
};

export default AccountNavigation;
