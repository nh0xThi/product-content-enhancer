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
 * page to the store's title bar (nested path under the app name), not inside our app.
 * Uses document.title and, when available, Shopify App Bridge (s-page / ui-title-bar).
 */
export default function EmbeddedShopifyTitleBar({ basePath, navItems }: EmbeddedShopifyTitleBarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasHost = !!searchParams.get('host');
  const containerRef = useRef<HTMLDivElement>(null);

  const currentNav = navItems.find((item) => pathname === basePath + item.path);
  const pageTitle = currentNav?.label ?? 'App';

  // Keep document.title in sync so the iframe title reflects the page (admin may show it)
  useEffect(() => {
    if (!hasHost) return;
    const prev = document.title;
    document.title = `${APP_TITLE} – ${pageTitle}`;
    return () => {
      document.title = prev;
    };
  }, [hasHost, pageTitle]);

  // When App Bridge is loaded, render s-page so the Shopify Admin title bar shows the nested path.
  // The component is hidden in our iframe; it only drives the parent admin UI.
  useEffect(() => {
    if (!hasHost || !containerRef.current) return;
    const container = containerRef.current;
    const existing = document.querySelector('script[data-api-key][src*="app-bridge"]');
    if (!existing) return;

    // Use Shopify's s-page web component if defined (by app-bridge.js from root layout)
    const PageComponent = document.createElement('s-page');
    PageComponent.setAttribute('heading', pageTitle);

    // Breadcrumb: link back to app root so the store shows "App Name > Current page"
    const breadcrumbSlot = document.createElement('div');
    breadcrumbSlot.slot = 'breadcrumb-actions';
    const homeLink = document.createElement('a');
    homeLink.href = basePath + '/dashboard';
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
  }, [hasHost, pageTitle, basePath]);

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
