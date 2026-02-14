import DashboardLayout from '@/components/layouts/DashboardLayout';
import { AppBasePathProvider } from '@/context/AppBasePathContext';

export const dynamic = 'force-dynamic';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppBasePathProvider basePath="/app">
      <DashboardLayout basePath="/app" variant="embedded">
        {children}
      </DashboardLayout>
    </AppBasePathProvider>
  );
}
