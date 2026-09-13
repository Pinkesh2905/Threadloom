'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  Palette,
  Shirt,
  Ruler,
  CheckCircle2,
  Scissors,
  Boxes,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import Lenis from 'lenis';
import { ThreadloomLogo } from '@/components/ThreadloomLogo';
import { SplashScreen } from '@/components/SplashScreen';
import { GarmentTeaser } from '@/components/GarmentTeaser';

export default function LandingPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (isInitialized && user) {
      router.replace('/studio');
    }
  }, [isInitialized, user, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || shouldReduceMotion) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    const animId = requestAnimationFrame(raf);

    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.hash && anchor.hash.startsWith('#')) {
        const targetEl = document.querySelector(anchor.hash);
        if (targetEl && targetEl instanceof HTMLElement) {
          e.preventDefault();
          lenis.scrollTo(targetEl, { offset: -80, duration: 1.5 });
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);

    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener('click', handleAnchorClick);
      lenis.destroy();
    };
  }, [shouldReduceMotion]);

  const sectionVariants: Variants = {
    hidden: { opacity: 0, y: 36 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.75,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: 0.14,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  if (!isInitialized || user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg text-ink font-sans selection:bg-accent selection:text-white relative overflow-x-hidden">
      <SplashScreen duration={2000} />

      {/* Sticky Header Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-hairline transition-colors">
        <div className="max-w-6xl mx-auto px-sp-3 sm:px-sp-4 lg:px-sp-5 h-16 sm:h-24 flex items-center justify-between">
          <div className="flex items-center space-x-sp-4">
            <Link href="/" className="group flex items-center py-1">
              <ThreadloomLogo size="md" />
            </Link>
            <nav className="hidden md:flex items-center space-x-sp-3 text-xs font-semibold uppercase tracking-wider text-secondary">
              <a href="#studio" className="hover:text-ink active:text-ink transition-colors">The Studio</a>
              <a href="#production" className="hover:text-ink active:text-ink transition-colors">Production</a>
              <a href="#code" className="hover:text-ink active:text-ink transition-colors">No AI, By Design</a>
            </nav>
          </div>

          <div className="flex items-center space-x-sp-2 text-xs font-semibold uppercase tracking-wider">
            {isInitialized && user ? (
              <Link
                href="/studio"
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-ink text-white hover:bg-black active:bg-black active:scale-[0.98] transition-colors shadow-xs flex items-center space-x-1"
              >
                <span>My Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 sm:px-4 py-2 text-secondary hover:text-ink active:text-ink transition-colors text-xs"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-ink text-white hover:bg-black active:bg-black active:scale-[0.98] transition-colors shadow-xs text-xs"
                >
                  Start Designing
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* SECTION 1: Hero */}
      <section className="min-h-screen pt-24 sm:pt-36 pb-12 sm:pb-16 flex flex-col justify-center max-w-6xl mx-auto px-sp-3 sm:px-sp-4 lg:px-sp-5 relative">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          className="max-w-2xl space-y-sp-4 text-left"
        >
          <motion.h1
            variants={itemVariants}
            className="font-serif text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.12] text-ink"
          >
            Design the garment. <span className="italic">We cut, print and ship it.</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-secondary text-sm sm:text-base max-w-lg leading-relaxed font-sans"
          >
            Choose the cut, the color, the text, the placement — a full made-to-order clothing studio
            with nothing generated by a language model. Every pixel is rendered by ordinary, inspectable code.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-sp-1 w-full sm:w-auto"
          >
            <Link
              href={isInitialized && user ? "/studio" : "/register"}
              className="px-7 py-3.5 sm:py-4 rounded-full bg-ink hover:bg-black active:bg-black active:scale-[0.98] text-white font-semibold text-xs uppercase tracking-wider transition-colors duration-200 shadow-md flex items-center justify-center space-x-2 group w-full sm:w-auto"
            >
              <span>{isInitialized && user ? "Enter Your Studio" : "Start Your First Design"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <a
              href="#studio"
              className="px-6 py-3.5 sm:py-4 rounded-full bg-surface-subtle hover:bg-white active:bg-white text-secondary hover:text-ink active:text-ink border border-hairline font-semibold text-xs uppercase tracking-wider transition-colors text-center w-full sm:w-auto"
            >
              See How It Works
            </a>
          </motion.div>
        </motion.div>

        {/* Live SVG-based garment teaser — real interaction, zero AI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-sp-6"
        >
          <GarmentTeaser />
        </motion.div>
      </section>

      {/* SECTION 2: Problem Framing */}
      <section id="studio" className="py-24 border-t border-hairline bg-white">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={sectionVariants}
          className="max-w-6xl mx-auto px-sp-3 sm:px-sp-4 lg:px-sp-5 grid grid-cols-1 lg:grid-cols-2 gap-sp-6 items-center"
        >
          <div className="space-y-sp-3">
            <span className="text-secondary text-xs font-semibold uppercase tracking-wider">
              The Off-The-Rack Problem
            </span>
            <h2 className="font-serif text-4xl sm:text-6xl text-ink leading-[1.1]">
              Every t-shirt site sells you <span className="italic">someone else&apos;s design.</span>
            </h2>
            <p className="text-secondary text-base leading-relaxed font-sans">
              Print-on-demand storefronts hand you a handful of templates. Bespoke tailors take weeks
              and cost a fortune. Threadloom sits between the two: a real design canvas — garment type,
              neckline, sleeve length, pocket placement, fabric color, printed or embroidered text and
              artwork — with production tooling underneath it, not a mockup generator.
            </p>
          </div>

          <div className="bg-surface-subtle border border-hairline rounded-3xl p-sp-4 sm:p-sp-5 space-y-sp-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <span className="text-xs font-semibold text-ink uppercase tracking-wide">What You Control</span>
              <span className="text-xs font-bold text-accent">Phase 1 Studio</span>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-3 bg-white rounded-xl border border-hairline flex items-center justify-between">
                <span className="text-xs font-medium text-secondary flex items-center gap-2"><Shirt className="w-3.5 h-3.5" /> Garment & Style</span>
                <span className="text-sm font-bold text-ink font-sans">Type, neckline, sleeve, fit</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-hairline flex items-center justify-between">
                <span className="text-xs font-medium text-secondary flex items-center gap-2"><Palette className="w-3.5 h-3.5" /> Color & Print Zones</span>
                <span className="text-sm font-bold text-ink font-sans">Front, back, sleeve, pocket</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-hairline flex items-center justify-between">
                <span className="text-xs font-medium text-secondary flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> Generative AI Used</span>
                <span className="text-sm font-bold text-accent font-sans">0 (Zero)</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* SECTION 3: Feature Storytelling */}
      <section className="py-28 border-t border-hairline bg-surface-subtle">
        <div className="max-w-6xl mx-auto px-sp-3 sm:px-sp-4 lg:px-sp-5 space-y-24">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-secondary text-xs font-semibold uppercase tracking-wider">
              How It&apos;s Built
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl text-ink">
              Advanced features, ordinary code.
            </h2>
          </div>

          {/* Block 01: Layered design canvas */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={sectionVariants}
            className="grid grid-cols-1 lg:grid-cols-2 gap-sp-6 items-center"
          >
            <div className="space-y-4">
              <span className="font-serif italic text-3xl sm:text-4xl text-secondary">01</span>
              <h3 className="font-serif text-3xl sm:text-4xl text-ink">
                A layered canvas per print zone, not one flat mockup.
              </h3>
              <p className="text-secondary text-base leading-relaxed font-sans">
                Text, uploaded artwork, and pocket overlays are independent, draggable layers across
                front, back and sleeve zones — the same layer model real print-on-demand tools use,
                built on open canvas libraries instead of a chat model guessing your intent.
              </p>
            </div>
            <div className="bg-white border border-hairline rounded-3xl p-6 shadow-xs flex flex-col items-center justify-center min-h-[280px]">
              <div className="w-full max-w-xs aspect-square bg-surface-subtle rounded-2xl flex items-center justify-center relative p-4 border border-dashed border-hairline">
                <Layers className="w-20 h-20 text-ink/40 stroke-[1.2]" />
                <span className="absolute top-3 left-3 px-2 py-0.5 bg-ink text-white text-[10px] font-semibold uppercase tracking-wider rounded-full">
                  react-konva canvas
                </span>
              </div>
            </div>
          </motion.div>

          {/* Block 02: Local image cleanup */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={sectionVariants}
            className="grid grid-cols-1 lg:grid-cols-2 gap-sp-6 items-center"
          >
            <div className="bg-white border border-hairline rounded-3xl p-6 shadow-xs flex flex-col items-center justify-center min-h-[280px] order-2 lg:order-1">
              <div className="w-full max-w-xs space-y-3">
                <div className="p-3 bg-surface-subtle rounded-xl border border-hairline flex items-center justify-between text-xs">
                  <span className="text-secondary">Uploaded Logo</span>
                  <span className="font-semibold text-ink">Background Removed</span>
                </div>
                <div className="p-3 bg-surface-subtle rounded-xl border border-hairline flex items-center justify-between text-xs">
                  <span className="text-secondary">Print Method: Screen Print</span>
                  <span className="font-semibold text-accent">3-Color Separation</span>
                </div>
                <div className="p-3 bg-surface-subtle rounded-xl border border-hairline flex items-center justify-between text-xs">
                  <span className="text-secondary">Vectorization</span>
                  <span className="font-semibold text-ink">Raster → Scalable Path</span>
                </div>
              </div>
            </div>
            <div className="space-y-4 order-1 lg:order-2">
              <span className="font-serif italic text-3xl sm:text-4xl text-secondary">02</span>
              <h3 className="font-serif text-3xl sm:text-4xl text-ink">
                Your logo, cleaned up by classical computer vision.
              </h3>
              <p className="text-secondary text-base leading-relaxed font-sans">
                Uploaded artwork runs through local background removal, k-means color reduction for
                accurate spot-color print pricing, and raster-to-vector tracing — narrow, self-hosted
                vision tools, never a call to a commercial AI API.
              </p>
            </div>
          </motion.div>

          {/* Block 03: Production tooling */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={sectionVariants}
            className="grid grid-cols-1 lg:grid-cols-2 gap-sp-6 items-center"
          >
            <div className="space-y-4">
              <span className="font-serif italic text-3xl sm:text-4xl text-secondary">03</span>
              <h3 className="font-serif text-3xl sm:text-4xl text-ink">
                Real factory paperwork, generated automatically.
              </h3>
              <p className="text-secondary text-base leading-relaxed font-sans">
                Every order can produce an actual embroidery machine file, a fabric-nesting yield
                estimate, and a tech-pack spec sheet — the same production tooling a garment factory
                already uses, assembled from geometry and file-format libraries.
              </p>
            </div>
            <div className="bg-white border border-hairline rounded-3xl p-6 shadow-xs flex flex-col items-center justify-center min-h-[280px]">
              <div className="w-full max-w-xs bg-surface-subtle border border-hairline rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Spec Sheet</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold">
                    Auto-Generated PDF
                  </span>
                </div>
                <div className="text-2xl font-bold text-ink font-sans flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-secondary" /> Embroidery Ready
                </div>
                <div className="w-full bg-hairline rounded-full h-1.5 overflow-hidden">
                  <div className="bg-accent h-full w-3/4 rounded-full" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Block 04: 3D preview roadmap */}
          <motion.div
            id="production"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={sectionVariants}
            className="grid grid-cols-1 lg:grid-cols-2 gap-sp-6 items-center"
          >
            <div className="bg-white border border-hairline rounded-3xl p-6 shadow-xs flex flex-col items-center justify-center min-h-[280px] order-2 lg:order-1">
              <div className="w-full max-w-xs bg-surface-subtle border border-hairline rounded-2xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-ink font-semibold text-xs border-b border-hairline pb-2">
                  <Boxes className="w-4 h-4" />
                  <span>3D Live Preview • Phase 3</span>
                </div>
                <div className="text-[11px] text-secondary space-y-1">
                  <div className="flex justify-between">
                    <span>Your 2D layers</span>
                    <span className="text-accent font-semibold">Baked to texture</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rendering engine</span>
                    <span className="text-ink font-semibold">three.js, in-browser</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4 order-1 lg:order-2">
              <span className="font-serif italic text-3xl sm:text-4xl text-secondary">04</span>
              <h3 className="font-serif text-3xl sm:text-4xl text-ink">
                From flat canvas to a garment you can rotate.
              </h3>
              <p className="text-secondary text-base leading-relaxed font-sans">
                Once the 2D studio ships, your design bakes onto a real 3D garment model you can spin
                and inspect before ordering — rendered locally in the browser, no cloud AI in the loop.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 4: No AI, by design */}
      <section id="code" className="py-20 border-t border-hairline bg-white">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={sectionVariants}
          className="max-w-4xl mx-auto px-sp-3 sm:px-sp-4 lg:px-sp-5 text-center space-y-sp-4"
        >
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-surface-subtle border border-hairline text-secondary text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            <span>Honest Engineering</span>
          </div>

          <h2 className="font-serif text-4xl sm:text-6xl text-ink tracking-tight">
            Zero generative AI APIs. <br />
            <span className="italic">100% deterministic, inspectable code.</span>
          </h2>

          <p className="text-secondary text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-sans">
            Every &quot;smart&quot; feature — recoloring, background removal, color separation, contrast picking,
            fabric nesting — is a named algorithm you could read the source of, running on our own
            servers. Nothing is sent to a third-party language model, and nothing about your design is
            ever training data.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-sp-3 pt-sp-2 text-left">
            <div className="p-4 bg-surface-subtle rounded-2xl border border-hairline space-y-1.5">
              <Cpu className="w-5 h-5 text-accent" />
              <div className="text-xs font-semibold uppercase tracking-wide text-ink">Classical Vision Only</div>
              <p className="text-xs text-secondary leading-relaxed font-sans">Background removal and color math run locally with narrow, single-purpose libraries.</p>
            </div>
            <div className="p-4 bg-surface-subtle rounded-2xl border border-hairline space-y-1.5">
              <Ruler className="w-5 h-5 text-accent" />
              <div className="text-xs font-semibold uppercase tracking-wide text-ink">Rule-Based Pricing</div>
              <p className="text-xs text-secondary leading-relaxed font-sans">Cost is computed from print zones, color count and finishing method — no black box.</p>
            </div>
            <div className="p-4 bg-surface-subtle rounded-2xl border border-hairline space-y-1.5">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              <div className="text-xs font-semibold uppercase tracking-wide text-ink">You Own the Design</div>
              <p className="text-xs text-secondary leading-relaxed font-sans">Export your design file or delete it entirely — it never leaves your account otherwise.</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* SECTION 5: Final CTA */}
      <section className="py-32 border-t border-hairline bg-surface-subtle text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={sectionVariants}
          className="max-w-3xl mx-auto px-sp-3 sm:px-sp-4 lg:px-sp-5 space-y-sp-4"
        >
          <h2 className="font-serif text-5xl sm:text-7xl text-ink tracking-tight">
            Your first design <br />
            <span className="italic">takes minutes, not weeks.</span>
          </h2>
          <p className="text-secondary text-base sm:text-lg max-w-xl mx-auto leading-relaxed font-sans">
            Create a free account and claim your first garment slot.
          </p>
          <div className="pt-2">
            <Link
              href={isInitialized && user ? "/studio" : "/register"}
              className="inline-flex items-center space-x-2 px-9 py-4 rounded-full bg-ink hover:bg-black active:bg-black active:scale-[0.98] text-white font-semibold text-xs uppercase tracking-wider transition-colors shadow-md group"
            >
              <span>{isInitialized && user ? "Return to My Studio" : "Create Free Account"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* SECTION 6: Footer */}
      <footer className="border-t border-hairline bg-white py-12 text-xs text-secondary font-sans">
        <div className="max-w-6xl mx-auto px-sp-3 sm:px-sp-4 lg:px-sp-5 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <ThreadloomLogo variant="horizontal" size="sm" />
            <span className="text-hairline">|</span>
            <span>© 2026 Threadloom. All rights reserved.</span>
          </div>

          <div className="flex items-center space-x-6">
            <Link href="/privacy" className="hover:text-ink active:text-ink transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-ink active:text-ink transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
