import Link from 'next/link';
import { redirect } from 'next/navigation';

export default function Home({
  searchParams,
}: {
  searchParams?: { host?: string };
}) {
  if (searchParams?.host) {
    redirect(`/app/dashboard?host=${encodeURIComponent(searchParams.host)}`);
  }

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: 'var(--app-bg, #f4f6f8)' }}>
      <main className="flex-1 w-full max-w-none flex items-center justify-center px-6 py-16 sm:px-10 sm:py-24">
        <div className="w-full max-w-lg mx-auto text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: 'var(--app-text, #202223)' }}>
            Product Data Optimizer
          </h1>
          <p className="mt-4 text-base sm:text-lg" style={{ color: 'var(--app-text-subdued, #6d7175)' }}>
            Enhance product content for better SEO and conversion. Connect your store and start generating optimized descriptions.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/app/dashboard"
              className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 text-base font-medium text-white rounded-[var(--app-radius-sm,8px)] hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#008060] transition-opacity"
              style={{ background: '#008060' }}
            >
              Get Started
            </Link>
            <Link
              href="/app/dashboard"
              className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 text-base font-medium rounded-[var(--app-radius-sm,8px)] border hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
              style={{ color: 'var(--app-text)', borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </main>
      <footer
        className="w-full py-6 text-center text-sm border-t"
        style={{ color: 'var(--app-text-subdued)', borderColor: 'var(--app-border)', background: 'rgba(255,255,255,0.6)' }}
      >
        Product content enhancer for Shopify
      </footer>
    </div>
  );
}
