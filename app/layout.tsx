import "./globals.css";
import "./styles.css";
import "@shopify/polaris/build/esm/styles.css";
import { Metadata } from 'next';
import Script from 'next/script';
import FaviconUpdater from '@/components/FaviconUpdater';
import PolarisProvider from '@/components/PolarisProvider';

export const metadata: Metadata = {
  title: 'Product Data Optimizer',
  description: 'Product content enhancer for better SEO and CRO',
};

const shopifyApiKey = process.env.SHOPIFY_API_KEY;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {shopifyApiKey && (
          <Script
            src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
            data-api-key={shopifyApiKey}
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body>
        <PolarisProvider>
          <FaviconUpdater />
          {children}
        </PolarisProvider>
      </body>
    </html>
  );
}
