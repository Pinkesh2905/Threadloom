import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center text-center p-6 font-sans">
      <span className="font-serif text-6xl text-ink mb-3">404</span>
      <p className="text-secondary text-sm mb-6">This pattern hasn&apos;t been cut yet.</p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-full bg-ink hover:bg-black active:bg-black active:scale-[0.98] text-white text-xs font-semibold uppercase tracking-wider transition-colors"
      >
        Back to Threadloom
      </Link>
    </div>
  );
}
