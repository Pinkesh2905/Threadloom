'use client';

import React from 'react';

interface ThreadloomLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 'stacked' is the icon-over-wordmark lockup (with tagline baked in);
   *  'full'/'horizontal' is the icon-beside-wordmark lockup. */
  variant?: 'full' | 'horizontal' | 'stacked';
}

// Heights tuned to each lockup's own aspect ratio (horizontal ~2.96:1, stacked ~1.02:1).
const HORIZONTAL_HEIGHT: Record<NonNullable<ThreadloomLogoProps['size']>, string> = {
  sm: 'h-7 sm:h-9',
  md: 'h-9 sm:h-12',
  lg: 'h-12 sm:h-16',
  xl: 'h-16 sm:h-20',
};

const STACKED_HEIGHT: Record<NonNullable<ThreadloomLogoProps['size']>, string> = {
  sm: 'h-24',
  md: 'h-32',
  lg: 'h-44',
  xl: 'h-60',
};

export const ThreadloomLogo: React.FC<ThreadloomLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'full',
}) => {
  if (variant === 'stacked') {
    return (
      <img
        src="/images/logo-stacked.png"
        alt="Threadloom — Design Wear Your Way"
        className={`${STACKED_HEIGHT[size]} w-auto object-contain ${className}`}
      />
    );
  }

  return (
    <img
      src="/images/logo-horizontal.png"
      alt="Threadloom — Design Wear Your Way"
      className={`${HORIZONTAL_HEIGHT[size]} w-auto object-contain ${className}`}
    />
  );
};
