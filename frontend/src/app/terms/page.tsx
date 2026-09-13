import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg font-sans">
      <div className="max-w-2xl mx-auto px-sp-3 sm:px-sp-4 py-sp-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-ink active:text-ink mb-sp-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Threadloom
        </Link>
        <h1 className="font-serif text-4xl text-ink mb-sp-3">Terms of Service</h1>
        <div className="space-y-sp-3 text-sm text-secondary leading-relaxed">
          <p>
            This is a placeholder terms page for the Threadloom project scaffold (Phase 0). Real terms —
            covering orders, production lead times, returns and design ownership — will be drafted once
            the storefront and checkout (Phase 5) are in place.
          </p>
        </div>
      </div>
    </div>
  );
}
