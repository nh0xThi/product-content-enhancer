'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Frame,
  Navigation,
  Box,
  BlockStack,
} from '@shopify/polaris';
import {
  HomeIcon,
  ContentIcon,
  ListBulletedIcon,
  StoreIcon,
  SettingsIcon,
} from '@shopify/polaris-icons';
import { getSettings } from '@/lib/settings';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { url: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { url: '/generate', label: 'Generate Content', icon: ContentIcon },
  { url: '/jobs', label: 'Jobs', icon: ListBulletedIcon },
  { url: '/stores', label: 'Stores', icon: StoreIcon },
  { url: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
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

  const frameLogo = logo
    ? {
        topBarSource: logo,
        contextualSaveBarSource: logo,
        url: '/dashboard',
        accessibilityLabel: shopName || 'App logo',
        width: 124,
      }
    : undefined;

  const navMarkup = (
    <Navigation location={pathname || '/'}>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Navigation.Item
            key={item.url}
            url={item.url}
            label={item.label}
            icon={Icon}
          />
        );
      })}
    </Navigation>
  );

  return (
    <Frame logo={frameLogo} navigation={navMarkup} >
      <div className="mx-auto w-full max-w-screen-2xl">
        {/* <BlockStack gap="500"> */}
          {children}
        {/* </BlockStack> */}
      </div>
    </Frame>
  );
}
