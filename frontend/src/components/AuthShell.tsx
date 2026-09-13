'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ThreadloomLogo } from '@/components/ThreadloomLogo';

interface AuthShellProps {
  children: React.ReactNode;
}

/**
 * Split-screen auth frame: brand panel on the left, form content on the
 * right. Collapses to a compact top brand strip on mobile.
 */
export const AuthShell: React.FC<AuthShellProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-bg font-sans grid grid-cols-1 lg:grid-cols-2">
      {/* Left brand panel — desktop only */}
      <div className="hidden lg:flex relative flex-col items-center justify-center bg-surface-subtle overflow-hidden px-sp-5">
        <div className="absolute w-[32rem] h-[32rem] rounded-full bg-accent/10 blur-3xl pointer-events-none -top-24 -left-24" />
        <div className="absolute w-[24rem] h-[24rem] rounded-full bg-accent/10 blur-3xl pointer-events-none bottom-0 right-0" />
        <div className="linen-texture absolute inset-0 opacity-40 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col items-center text-center max-w-sm"
        >
          <Link href="/">
            <ThreadloomLogo variant="stacked" size="xl" />
          </Link>
          <p className="mt-sp-4 text-sm text-secondary leading-relaxed">
            A made-to-order clothing studio where you design the garment yourself —
            rendered with plain code, never a generative AI model.
          </p>
        </motion.div>
      </div>

      {/* Mobile top brand strip */}
      <div className="lg:hidden flex items-center justify-center py-sp-4 border-b border-hairline bg-white">
        <Link href="/">
          <ThreadloomLogo variant="horizontal" size="md" />
        </Link>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-sp-3 sm:p-sp-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};
