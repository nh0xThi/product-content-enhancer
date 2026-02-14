'use client';

import Link from 'next/link';
import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import { NotifyProvider } from '@/context/NotifyContext';

/** Polaris-compatible link props for AppProvider linkComponent */
interface PolarisLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  url: string;
  children?: React.ReactNode;
  external?: boolean;
}

function PolarisLink({ url, children, external, ...rest }: PolarisLinkProps) {
  if (external) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={url} {...rest}>
      {children}
    </Link>
  );
}

export default function PolarisProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider i18n={enTranslations} linkComponent={PolarisLink}>
      <NotifyProvider>
        {children}
      </NotifyProvider>
    </AppProvider>
  );
}
