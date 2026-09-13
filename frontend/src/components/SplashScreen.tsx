'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  duration?: number;
  onComplete?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  duration = 2000,
  onComplete,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
          className="fixed inset-0 z-[9999] bg-bg flex flex-col items-center justify-center p-6 select-none overflow-hidden"
        >
          {/* Subtle ambient background flare */}
          <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-accent/5 blur-3xl pointer-events-none -z-10" />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center space-y-6 max-w-sm sm:max-w-md w-full"
          >
            <img
              src="/images/logo-stacked.png"
              alt="Threadloom — Design Wear Your Way"
              className="h-40 sm:h-52 w-auto object-contain"
            />

            {/* Minimalist progress line */}
            <div className="w-32 sm:w-44 h-[2px] bg-hairline rounded-full overflow-hidden relative">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="w-1/2 h-full bg-accent rounded-full"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
