'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Shirt, Package, LogOut, User, X, ShieldCheck, MapPin } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { ThreadloomLogo } from '@/components/ThreadloomLogo';

export const Navbar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout();
    router.push('/');
  };

  const navLinks = [
    { href: '/studio', label: 'Studio', icon: Layers },
    { href: '/design', label: 'Design', icon: Shirt },
    { href: '/orders', label: 'Orders', icon: Package },
    ...(user?.is_staff ? [{ href: '/admin/orders', label: 'Admin', icon: ShieldCheck }] : []),
  ];

  const isLinkActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Desktop Top Navbar (md & above) */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-hairline transition-colors">
        <div className="max-w-7xl mx-auto px-sp-3 sm:px-sp-4 lg:px-sp-6 h-16 sm:h-24 flex items-center justify-between gap-sp-4">
          {/* Desktop Brand Logo */}
          <Link href="/studio" className="hidden md:flex items-center group shrink-0 py-1">
            <ThreadloomLogo size="md" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-sp-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-sp-1 text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-full transition-colors duration-200 border ${
                    isActive
                      ? 'bg-accent text-white border-accent'
                      : 'text-secondary hover:text-ink hover:bg-surface-subtle active:text-ink active:bg-surface-subtle border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section (Desktop) */}
          {user && (
            <div className="hidden md:flex items-center space-x-sp-2 shrink-0">
              <div className="flex items-center space-x-sp-1 text-xs text-secondary bg-surface-subtle px-3.5 py-1.5 rounded-full border border-hairline">
                <span className="truncate max-w-[150px] font-medium">
                  {user.display_name || user.email}
                </span>
              </div>
              <Link
                href="/account/addresses"
                className="flex items-center space-x-sp-1 text-xs font-medium text-secondary hover:text-ink px-3 py-1.5 rounded-full hover:bg-surface-subtle active:text-ink active:bg-surface-subtle border border-transparent transition-colors duration-200"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Addresses</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-sp-1 text-xs font-medium text-secondary hover:text-ink px-3 py-1.5 rounded-full hover:bg-surface-subtle active:text-ink active:bg-surface-subtle border border-transparent transition-colors duration-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Mobile Top Minimal Header */}
          <div className="flex md:hidden items-center justify-between w-full">
            <Link href="/studio" className="flex items-center space-x-sp-1">
              <ThreadloomLogo variant="horizontal" size="sm" />
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Tab Bar (< md) */}
      {user && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-lg border-t border-hairline px-sp-1 py-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] shadow-xs">
          <nav
            className="grid gap-sp-1 items-center max-w-md mx-auto"
            style={{ gridTemplateColumns: `repeat(${navLinks.length + 1}, 1fr)` }}
          >
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = isLinkActive(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex flex-col items-center justify-center py-1.5 w-full rounded-lg transition-colors relative ${
                    isActive ? 'text-accent font-semibold' : 'text-secondary hover:text-ink active:text-ink font-medium'
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[1.75]" />
                  <span className="text-[11px] mt-1 tracking-tight">{link.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className="absolute bottom-0 w-8 h-[2px] bg-accent rounded-full"
                    />
                  )}
                </Link>
              );
            })}

            {/* Profile Drawer Trigger */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-colors relative ${
                isProfileOpen ? 'text-accent font-semibold' : 'text-secondary hover:text-ink active:text-ink font-medium'
              }`}
            >
              <User className="w-5 h-5 stroke-[1.75]" />
              <span className="text-[11px] mt-1 tracking-tight">Profile</span>
            </button>
          </nav>
        </div>
      )}

      {/* Slide-Up Profile Drawer Modal (Mobile) */}
      <AnimatePresence>
        {isProfileOpen && user && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs md:hidden">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="w-full bg-white rounded-t-2xl shadow-2xl p-sp-3 sm:p-sp-4 space-y-sp-3 max-h-[85vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
            >
              <div className="w-12 h-1 bg-hairline rounded-full mx-auto -mt-1 mb-1" />

              <div className="flex items-center justify-between pb-sp-2 border-b border-hairline">
                <div>
                  <div className="text-[11px] font-semibold text-secondary uppercase tracking-wide">
                    Account
                  </div>
                  <h3 className="text-xl font-semibold text-ink truncate max-w-[240px]">
                    {user.display_name || user.email}
                  </h3>
                </div>
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="p-1.5 rounded-full bg-surface-subtle border border-hairline text-secondary hover:text-ink active:text-ink active:bg-hairline"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="editorial-card-flat p-sp-3 rounded-lg space-y-2 bg-surface-subtle text-xs">
                <div className="flex items-center justify-between text-secondary">
                  <span>Account Email</span>
                  <span className="text-ink font-medium">{user.email}</span>
                </div>
              </div>

              <Link
                href="/account/addresses"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2 text-xs font-medium text-secondary hover:text-ink active:text-ink px-3 py-2.5 rounded-lg hover:bg-surface-subtle active:bg-surface-subtle border border-hairline"
              >
                <MapPin className="w-4 h-4" />
                <span>Saved Addresses</span>
              </Link>

              <div className="pt-sp-1">
                <button
                  onClick={handleLogout}
                  className="w-full py-3 rounded-lg bg-ink hover:bg-black active:bg-black active:scale-[0.98] text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-sp-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out of Threadloom</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
