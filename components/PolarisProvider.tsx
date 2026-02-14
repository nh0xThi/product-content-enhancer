'use client';

import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import { NotifyProvider } from '@/context/NotifyContext';

export default function PolarisProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider i18n={enTranslations}>
      <NotifyProvider>
        {children}
      </NotifyProvider>
    </AppProvider>
  );
}
