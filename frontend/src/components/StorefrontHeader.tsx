'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { ThreadloomLogo } from '@/components/ThreadloomLogo';

/**
 * Header for the pages a signed-out visitor can reach. Shows the same
 * browse links either way, and swaps the sign-in call to action for a link
 * into the studio once there's a session.
 */
export const StorefrontHeader: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const links = [
    { href: '/shop?department=men', label: 'Men' },
    { href: '/shop?department=women', label: 'Women' },
    { href: '/design/gallery', label: 'Templates' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-hairline">
      <div className="max-w-6xl mx-auto px-sp-3 sm:px-sp-4 h-16 sm:h-20 flex items-center justify-between gap-sp-3">
        <Link href="/" className="shrink-0">
          <ThreadloomLogo variant="horizontal" size="sm" />
        </Link>

        <nav className="flex items-center gap-sp-1 sm:gap-sp-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 sm:px-4 py-2 rounded-full text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-colors ${
                pathname.startsWith(link.href.split('?')[0])
                  ? 'text-ink'
                  : 'text-secondary hover:text-ink active:text-ink'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="shrink-0">
          {user ? (
            <Link
              href="/studio"
              className="px-4 py-2 rounded-full bg-ink hover:bg-black active:bg-black text-white text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              My Studio
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded-full border border-hairline hover:border-ink active:border-ink text-ink text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
