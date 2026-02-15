'use client';

import { Suspense, useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Frame,
  Navigation,
} from '@shopify/polaris';
import {
  HomeIcon,
  ContentIcon,
  ListBulletedIcon,
  StoreIcon,
  SettingsIcon,
} from '@shopify/polaris-icons';
import { getSettings } from '@/lib/settings';
import EmbeddedShopifyTitleBar from '@/components/EmbeddedShopifyTitleBar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  /** Base path for nav links: "" for external (e.g. /dashboard), "/app" for embedded. */
  basePath?: string;
  /** "external" = always show sidebar; "embedded" = hide sidebar when inside Shopify (host param). */
  variant?: 'external' | 'embedded';
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { path: '/generate', label: 'Generate Content', icon: ContentIcon },
  { path: '/jobs', label: 'Jobs', icon: ListBulletedIcon },
  { path: '/stores', label: 'Stores', icon: StoreIcon },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

function DashboardLayoutInner({ children, basePath = '/app', variant = 'embedded' }: DashboardLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEmbeddedInShopify = !!searchParams.get('host');
  const hostParam = searchParams.get('host');
  const [logo, setLogo] = useState<string>('');
  const [shopName, setShopName] = useState<string>('');

  useEffect(() => {
    const loadSettings = () => {
      const settings = getSettings();
      setLogo(settings.logo || '');
      setShopName(settings.shopName || '');
    };
    loadSettings();
    const handleSettingsUpdate = () => loadSettings();
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, []);

  console.log('[DashboardLayout] basePath:', basePath);
  console.log('[DashboardLayout] variant:', variant);
  console.log('[DashboardLayout] pathname:', pathname);
  console.log('[DashboardLayout] host param:', hostParam);
  console.log('[DashboardLayout] isEmbeddedInShopify:', isEmbeddedInShopify);

  const withHostParam = (path: string) => {
    if (!hostParam) return path;
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}host=${encodeURIComponent(hostParam)}`;
  };
  // Embedded in Shopify: no sidebar; nested path appears in the store's admin title bar via App Bridge
  if (variant === 'embedded' && isEmbeddedInShopify) {
    return (
      <div className="embedded-app-wrapper">
        <EmbeddedShopifyTitleBar basePath={basePath} navItems={navItems} />
        <div className="mx-auto w-full max-w-screen-2xl embedded-app-content">
          {children}
        </div>
      </div>
    );
  }

  if (isEmbeddedInShopify) {
    return (
      <div className="mx-auto w-full max-w-screen-2xl">
        {children}
      </div>
    );
  }

  const frameLogo = logo
    ? {
        topBarSource: logo,
        contextualSaveBarSource: logo,
        url: basePath + '/dashboard',
        accessibilityLabel: shopName || 'App logo',
        width: 124,
      }
    : undefined;

  const visibleNavItems =
    basePath === '/app' && isEmbeddedInShopify
      ? navItems.filter((item) => item.path !== '/stores')
      : navItems;

  const navMarkup = (
    <Navigation location={pathname || '/'}>
      {visibleNavItems.map((item) => (
        <Navigation.Item
          key={item.path}
          url={withHostParam(basePath + item.path)}
          label={item.label}
          icon={item.icon}
        />
      ))}
    </Navigation>
  );

  return (
    <Frame logo={frameLogo} navigation={navMarkup}>
      <div className="mx-auto w-full max-w-screen-2xl">
        {children}
      </div>
    </Frame>
  );
}

export default function DashboardLayout(props: DashboardLayoutProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-screen-2xl">
          {props.children}
        </div>
      }
    >
      <DashboardLayoutInner {...props} />
    </Suspense>
  );
}
