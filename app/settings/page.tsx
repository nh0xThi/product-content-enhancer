'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Page,
  Layout,
  Card,
  BlockStack,
  TextField,
  Button,
  Box,
  Text,
} from '@shopify/polaris';
import { getSettings, saveSettings } from '@/lib/settings';

export default function SettingsPage() {
  const router = useRouter();
  const [perplexityKey, setPerplexityKey] = useState('');
  const [logo, setLogo] = useState<string>('');
  const [favicon, setFavicon] = useState<string>('');
  const [shopName, setShopName] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const settings = getSettings();
    setLogo(settings.logo || '');
    setFavicon(settings.favicon || '');
    setShopName(settings.shopName || '');
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogo((reader.result as string) || '');
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFavicon((reader.result as string) || '');
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      saveSettings({ logo, favicon, shopName });
      window.dispatchEvent(new Event('settingsUpdated'));
      setTimeout(() => {
        setSaving(false);
      }, 300);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };

  return (
    <Page
      fullWidth
      title="Settings"
      subtitle="Manage your application settings."
      primaryAction={{
        content: 'Save',
        onAction: handleSave,
        loading: saving,
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">
                  Branding
                </Text>
                <TextField
                  label="Shop name"
                  value={shopName}
                  onChange={setShopName}
                  placeholder="Enter your shop name"
                  autoComplete="off"
                />
                <BlockStack gap="300">
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    Logo
                  </Text>
                  <Box padding="300">
                    {logo && (
                      <Box paddingBlockEnd="200">
                        <img
                          src={logo}
                          alt="Logo"
                          style={{
                            maxWidth: 96,
                            maxHeight: 96,
                            objectFit: 'contain',
                          }}
                        />
                      </Box>
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      style={{ display: 'none' }}
                      aria-hidden
                    />
                    <Button
                      variant="secondary"
                      size="slim"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {logo ? 'Change logo' : 'Upload logo'}
                    </Button>
                    <Box paddingBlockStart="100">
                      <Text as="p" variant="bodySm" tone="subdued">
                        Recommended: 200×50px or similar aspect ratio
                      </Text>
                    </Box>
                  </Box>
                </BlockStack>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    Favicon
                  </Text>
                  <Box padding="200">
                    {favicon && (
                      <Box paddingBlockEnd="200">
                        <img
                          src={favicon}
                          alt="Favicon"
                          style={{
                            maxWidth: 64,
                            maxHeight: 64,
                            objectFit: 'contain',
                          }}
                        />
                      </Box>
                    )}
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFaviconUpload}
                      style={{ display: 'none' }}
                      aria-hidden
                    />
                    <Button
                      variant="secondary"
                      size="slim"
                      onClick={() => faviconInputRef.current?.click()}
                    >
                      {favicon ? 'Change favicon' : 'Upload favicon'}
                    </Button>
                    <Box paddingBlockStart="100">
                      <Text as="p" variant="bodySm" tone="subdued">
                        Recommended: 32×32px or 64×64px square
                      </Text>
                    </Box>
                  </Box>
                </BlockStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">
                  API keys
                </Text>
                <TextField
                  label="Perplexity AI API key"
                  value={perplexityKey}
                  onChange={setPerplexityKey}
                  type="password"
                  placeholder="Enter your Perplexity AI API key"
                  autoComplete="off"
                  helpText={
                    <span>
                      Get your API key from{' '}
                      <a
                        href="https://www.perplexity.ai/settings/api"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Perplexity AI Settings
                      </a>
                    </span>
                  }
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Account
                </Text>
                <Button variant="secondary" tone="critical" onClick={handleLogout}>
                  Sign out
                </Button>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
