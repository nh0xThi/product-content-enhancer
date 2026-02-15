'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useNotify } from '@/context/NotifyContext';
import { useAppBasePath } from '@/context/AppBasePathContext';
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Button,
  Text,
  Box,
  EmptyState,
  Modal,
  TextField,
  Icon,
} from '@shopify/polaris';
import { StoreIcon, LayoutBlockIcon, ProductIcon, MagicIcon } from '@shopify/polaris-icons';

interface ConnectedStore {
  id: string;
  shop: string;
  name: string;
  connectedAt: string;
}

export default function DashboardPage() {
  const basePath = useAppBasePath();
  const searchParams = useSearchParams();
  const [isInIframe, setIsInIframe] = useState(false);
  const isEmbedded = basePath === '/app' && (Boolean(searchParams.get('host')) || isInIframe);
  const notify = useNotify();
  const [connectedStores, setConnectedStores] = useState<ConnectedStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnectStoreModal, setShowConnectStoreModal] = useState(false);
  const [newStoreShop, setNewStoreShop] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [totalTokens, setTotalTokens] = useState(0);

  useEffect(() => {
    setIsInIframe(typeof window !== 'undefined' && window.top !== window.self);
    fetch('/api/stores')
      .then((res) => res.json())
      .then((data) => {
        setConnectedStores(data.stores || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        notify.error('Failed to load stores.');
      });
  }, [notify]);

  useEffect(() => {
    const loadTokens = () => {
      const stored = Number(localStorage.getItem('tokenUsageTotal') || '0');
      setTotalTokens(Number.isFinite(stored) ? stored : 0);
    };
    loadTokens();
    const handleTokenUpdate = () => loadTokens();
    window.addEventListener('tokenUsageUpdated', handleTokenUpdate);
    window.addEventListener('storage', handleTokenUpdate);
    return () => {
      window.removeEventListener('tokenUsageUpdated', handleTokenUpdate);
      window.removeEventListener('storage', handleTokenUpdate);
    };
  }, []);

  const handleConnectStore = () => {
    const shop = newStoreShop?.trim();
    if (!shop) return;
    const shopDomain = shop.replace(/\.myshopify\.com$/i, '');
    window.location.href = `/api/shopify/auth?shop=${encodeURIComponent(shopDomain)}.myshopify.com`;
  };

  return (
    <Page
      fullWidth
      title="Dashboard"
      subtitle="Overview of your stores and content generation."
      primaryAction={{
        content: 'Upgrade',
        onAction: () => {},
      }}
      secondaryActions={[
        {
          content: 'Add Credits',
          onAction: () => {},
        },
      ]}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* Stats row */}
            <Layout>
              <Layout.Section variant="oneThird">
                <Card>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm" tone="subdued">
                      Connected Stores
                    </Text>
                    <Text as="p" variant="headingXl">
                      {connectedStores.length}
                    </Text>
                  </BlockStack>
                </Card>
              </Layout.Section>
              <Layout.Section variant="oneThird">
                <Card>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm" tone="subdued">
                      Products Enhanced
                    </Text>
                    <Text as="p" variant="headingXl">
                      0
                    </Text>
                  </BlockStack>
                </Card>
              </Layout.Section>
              <Layout.Section variant="oneThird">
                <Card>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm" tone="subdued">
                      Tokens Used
                    </Text>
                    <Text as="p" variant="headingXl">
                      {totalTokens.toLocaleString()}
                    </Text>
                  </BlockStack>
                </Card>
              </Layout.Section>
            </Layout>

            {/* How to generate - flex row with Polaris icons */}
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="400" blockAlign="center" wrap>
                  <Text as="h2" variant="headingLg">
                    How to generate
                  </Text>
                  <Button url={`${basePath}/generate`} variant="primary" size="slim">
                    Go to Generate content
                  </Button>
                </InlineStack>
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 'var(--p-space-400)' }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="140px">
                    <BlockStack gap="300">
                      <Box padding="200" background="bg-fill-info" borderRadius="200" width="fit-content">
                        <Icon source={LayoutBlockIcon} tone="base" accessibilityLabel="Structure" />
                      </Box>
                      <BlockStack gap="050">
                        <Text as="p" fontWeight="semibold" variant="bodyMd">1. Structure</Text>
                        <Text as="p" variant="bodySm" tone="subdued">Choose template or custom</Text>
                      </BlockStack>
                    </BlockStack>
                  </Box>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="140px">
                    <BlockStack gap="300">
                      <Box padding="200" background="bg-fill-secondary" borderRadius="200" width="fit-content">
                        <Icon source={ProductIcon} tone="base" accessibilityLabel="Select product" />
                      </Box>
                      <BlockStack gap="050">
                        <Text as="p" fontWeight="semibold" variant="bodyMd">2. Select Product</Text>
                        <Text as="p" variant="bodySm" tone="subdued">Choose a product to enhance</Text>
                      </BlockStack>
                    </BlockStack>
                  </Box>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="140px">
                    <BlockStack gap="300">
                      <Box padding="200" background="bg-fill-secondary" borderRadius="200" width="fit-content">
                        <Icon source={MagicIcon} tone="base" accessibilityLabel="Generate" />
                      </Box>
                      <BlockStack gap="050">
                        <Text as="p" fontWeight="semibold" variant="bodyMd">3. Generate</Text>
                        <Text as="p" variant="bodySm" tone="subdued">Adjust prompt & generate</Text>
                      </BlockStack>
                    </BlockStack>
                  </Box>
                </div>
              </BlockStack>
            </Card>

            {/* Connected Stores list */}
            <Card>
              <BlockStack gap="400">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--p-space-300)' }}>
                  <Text as="h2" variant="headingLg">
                    Connected Stores
                  </Text>
                  {!isEmbedded && (
                    <Button variant="primary" icon={StoreIcon} onClick={() => setShowConnectStoreModal(true)} size="slim">
                      Connect Store
                    </Button>
                  )}
                </div>

                {loading ? (
                  <Box padding="600">
                    <Text as="p" tone="subdued">Loading…</Text>
                  </Box>
                ) : connectedStores.length === 0 ? (
                  <EmptyState
                    heading="No stores connected yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>
                      {isEmbedded
                        ? 'Your store should be connected via Shopify admin. If this is unexpected, reinstall the app.'
                        : 'Connect a Shopify store to start generating product content.'}
                    </p>
                  </EmptyState>
                ) : (
                  <BlockStack gap="300">
                    {connectedStores.map((store) => (
                      <div
                        key={store.id}
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: 'var(--p-space-400)',
                          padding: 'var(--p-space-400)',
                          background: 'var(--p-color-bg-surface-secondary)',
                          borderRadius: 'var(--p-border-radius-200)',
                        }}
                      >
                        <div style={{ flex: '1 1 0', minWidth: 0 }}>
                          <InlineStack gap="300" blockAlign="center" wrap={false}>
                            <Box padding="100" background="bg-fill-secondary" borderRadius="200">
                              <StoreIcon />
                            </Box>
                            <BlockStack gap="050">
                              <Text as="p" fontWeight="semibold" variant="bodyMd">
                                {store.name}
                              </Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                {store.shop}
                              </Text>
                            </BlockStack>
                          </InlineStack>
                        </div>
                        <div style={{ flex: '0 0 auto' }}>
                          <Button url={`${basePath}/generate`} variant="primary" size="slim">
                            Generate Content
                          </Button>
                        </div>
                      </div>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {!isEmbedded && (
        <Modal
          open={showConnectStoreModal}
          onClose={() => {
            setShowConnectStoreModal(false);
            setNewStoreShop('');
            setNewStoreName('');
          }}
          title="Connect New Store"
          primaryAction={{
            content: 'Connect Store',
            onAction: handleConnectStore,
            disabled: !newStoreShop?.trim(),
          }}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Text as="p" tone="subdued">
                You will be redirected to Shopify to authorize this app. After
                authorization, you&apos;ll be redirected back.
              </Text>
              <TextField
                label="Store domain"
                value={newStoreShop}
                onChange={setNewStoreShop}
                placeholder="your-store (without .myshopify.com)"
                autoComplete="off"
              />
              <TextField
                label="Store name (optional)"
                value={newStoreName}
                onChange={setNewStoreName}
                placeholder="My Store"
                autoComplete="off"
              />
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
