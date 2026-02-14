import "./globals.css";
import "./styles.css";
import "@shopify/polaris/build/esm/styles.css";
import { Metadata } from 'next';
import FaviconUpdater from '@/components/FaviconUpdater';
import PolarisProvider from '@/components/PolarisProvider';

export const metadata: Metadata = {
  title: 'Product Data Optimizer',
  description: 'Product content enhancer for better SEO and CRO',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PolarisProvider>
          <FaviconUpdater />
          {children}
        </PolarisProvider>
      </body>
    </html>
  );
}
