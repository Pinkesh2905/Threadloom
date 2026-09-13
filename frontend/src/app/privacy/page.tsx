import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg font-sans">
      <div className="max-w-2xl mx-auto px-sp-3 sm:px-sp-4 py-sp-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-ink active:text-ink mb-sp-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Threadloom
        </Link>
        <h1 className="font-serif text-4xl text-ink mb-sp-3">Privacy Policy</h1>
        <div className="space-y-sp-3 text-sm text-secondary leading-relaxed">
          <p>
            This is a placeholder privacy policy for the Threadloom project scaffold (Phase 0). It will
            be replaced with real, reviewed legal copy before any customer data is collected in production.
          </p>
          <p>
            In line with the project&apos;s design principles: uploaded artwork and design data are processed
            with self-hosted, deterministic image-processing code, never sent to a third-party generative
            AI API, and are deletable from your account at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
