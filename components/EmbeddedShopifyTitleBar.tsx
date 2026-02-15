'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

export interface NavItemForTitleBar {
  path: string;
  label: string;
}

interface EmbeddedShopifyTitleBarProps {
  basePath: string;
  navItems: NavItemForTitleBar[];
}

const APP_TITLE = 'Product Data Optimizer';

/**
 * When the app is embedded in Shopify Admin, this component syncs the current
 * path to the store's admin URL (so the nested path appears in the address bar)
 * and title bar. Uses App Bridge Navigation API and document.title.
 */
export default function EmbeddedShopifyTitleBar({ basePath, navItems }: EmbeddedShopifyTitleBarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hostParam = searchParams.get('host');
  const hasHost = !!hostParam;
  const containerRef = useRef<HTMLDivElement>(null);

  const currentNav = navItems.find((item) => pathname === basePath + item.path);
  const pageTitle = currentNav?.label ?? 'App';

  // Sync the admin's top-level URL to the current path so the nested path appears (e.g. .../apps/your-app/app/dashboard)
  useEffect(() => {
    if (!hasHost || !pathname) return;
    const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
    const trySync = () => {
      const shopify = typeof window !== 'undefined' ? window.shopify : undefined;
      if (shopify?.navigation?.navigate) {
        shopify.navigation.navigate(path, { history: 'replace' });
        return true;
      }
      return false;
    };
    if (trySync()) return;
    // App Bridge script may load after first paint; retry once after a short delay
    const t = window.setTimeout(() => {
      trySync();
    }, 300);
    return () => window.clearTimeout(t);
  }, [hasHost, pathname]);

  // Keep document.title in sync so the iframe title reflects the page
  useEffect(() => {
    if (!hasHost) return;
    const prev = document.title;
    document.title = `${APP_TITLE} – ${pageTitle}`;
    return () => {
      document.title = prev;
    };
  }, [hasHost, pageTitle]);

  // Optional: s-page for admin title bar label (if App Bridge exposes it)
  useEffect(() => {
    if (!hasHost || !containerRef.current) return;
    const container = containerRef.current;
    const existing = document.querySelector('script[data-api-key][src*="app-bridge"]');
    if (!existing) return;

    const PageComponent = document.createElement('s-page');
    PageComponent.setAttribute('heading', pageTitle);

    const breadcrumbSlot = document.createElement('div');
    breadcrumbSlot.slot = 'breadcrumb-actions';
    const homeLink = document.createElement('a');
    if (hostParam) {
      homeLink.href = `${basePath}/dashboard?host=${encodeURIComponent(hostParam)}`;
    } else {
      homeLink.href = basePath + '/dashboard';
    }
    homeLink.textContent = APP_TITLE;
    breadcrumbSlot.appendChild(homeLink);
    PageComponent.appendChild(breadcrumbSlot);

    container.appendChild(PageComponent);
    return () => {
      try {
        container.removeChild(PageComponent);
      } catch {
        // ignore
      }
    };
  }, [hasHost, pageTitle, basePath, hostParam]);

  if (!hasHost) return null;

  // Hidden container: s-page talks to the parent admin; we don't show it in our app
  return (
    <div
      ref={containerRef}
      className="embedded-shopify-title-bar"
      aria-hidden
    />
  );
}
