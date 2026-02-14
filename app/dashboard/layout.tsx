'use client';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import { AppBasePathProvider } from '@/context/AppBasePathContext';

export default function ExternalDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppBasePathProvider basePath="">
      <DashboardLayout basePath="" variant="external">
        {children}
      </DashboardLayout>
    </AppBasePathProvider>
  );
}
