'use client';

import { useState, useEffect } from 'react';
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
  Badge,
} from '@shopify/polaris';
import { StoreIcon } from '@shopify/polaris-icons';
import { useNotify } from '@/context/NotifyContext';

interface ConnectedStore {
  id: string;
  shop: string;
  name: string;
  connectedAt: string;
  status: 'active' | 'inactive';
  description?: string;
}

export default function StoresPage() {
  const notify = useNotify();
  const [stores, setStores] = useState<ConnectedStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnectStoreModal, setShowConnectStoreModal] = useState(false);
  const [newStoreShop, setNewStoreShop] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [showStoreDetailModal, setShowStoreDetailModal] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [storeDescription, setStoreDescription] = useState('');

  const getStoredDescription = (storeId: string) => {
    try {
      return localStorage.getItem(`storeDescription:${storeId}`) || '';
    } catch {
      return '';
    }
  };

  const setStoredDescription = (storeId: string, description: string) => {
    try {
      localStorage.setItem(`storeDescription:${storeId}`, description);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetch('/api/stores')
      .then((res) => res.json())
      .then((data) => {
        const mappedStores = (data.stores || []).map((store: ConnectedStore) => ({
          ...store,
          description: getStoredDescription(store.id),
        }));
        setStores(mappedStores);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleConnectStore = () => {
    const shop = newStoreShop?.trim();
    if (!shop) return;
    const shopDomain = shop.replace(/\.myshopify\.com$/i, '');
    window.location.href = `/api/shopify/auth?shop=${encodeURIComponent(shopDomain)}.myshopify.com`;
  };

  const handleDisconnect = async (storeId: string) => {
    try {
      const response = await fetch(`/api/stores?id=${storeId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        const data = await fetch('/api/stores').then((res) => res.json());
        setStores(data.stores || []);
        notify.success('Store disconnected.');
      } else {
        const data = await response.json().catch(() => ({}));
        notify.error(data?.error || 'Failed to disconnect store.');
      }
    } catch (error) {
      console.error('Error disconnecting store:', error);
      notify.error('Failed to disconnect store.');
    }
  };

  const handleStoreDetail = (storeId: string) => {
    const store = stores.find((item) => item.id === storeId);
    if (!store) return;
    setSelectedStoreId(storeId);
    setStoreDescription(store.description || '');
    setShowStoreDetailModal(true);
  };

  const handleStoreDetailClose = () => {
    setShowStoreDetailModal(false);
    setSelectedStoreId(null);
    setStoreDescription('');
  };

  const handleStoreDetailSave = () => {
    if (!selectedStoreId) return;
    setStoredDescription(selectedStoreId, storeDescription.trim());
    setStores((prev) =>
      prev.map((store) =>
        store.id === selectedStoreId
          ? { ...store, description: storeDescription.trim() }
          : store
      )
    );
    handleStoreDetailClose();
  };

  const selectedStore = stores.find((store) => store.id === selectedStoreId);

  return (
    <Page
      fullWidth
      title="Connected Stores"
      subtitle="Manage your connected Shopify stores."
    >
      <Layout>
        <Layout.Section>
          {loading ? (
            <Card>
              <Box padding="800">
                <Text as="p" tone="subdued">
                  Loading…
                </Text>
              </Box>
            </Card>
          ) : stores.length === 0 ? (
            <Card>
              <EmptyState
                heading="No stores connected yet"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                action={{
                  content: 'Connect Your First Store',
                  onAction: () => setShowConnectStoreModal(true),
                }}
              >
                <p>Connect a Shopify store to start generating product content.</p>
              </EmptyState>
            </Card>
          ) : (
            <BlockStack gap="400">
              {stores.map((store) => (
                <Card key={store.id}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 'var(--p-space-400)' }}>
                    {/* Left: store info */}
                    <div style={{ flex: '1 1 0', minWidth: 0 }}>
                      <BlockStack gap="300">
                        <InlineStack gap="300" blockAlign="center" wrap={false}>
                          <Box padding="100" background="bg-fill-secondary" borderRadius="200">
                            <StoreIcon />
                          </Box>
                          <BlockStack gap="050">
                            <Text as="p" fontWeight="semibold" variant="bodyLg">
                              {store.name}
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              {store.shop}
                            </Text>
                          </BlockStack>
                          <Badge tone={store.status === 'active' ? 'success' : 'read-only'}>
                            {store.status}
                          </Badge>
                        </InlineStack>
                        <BlockStack gap="100">
                          {store.description ? (
                            <Text as="p" variant="bodySm" tone="subdued">
                              {store.description}
                            </Text>
                          ) : null}
                          <Text as="p" variant="bodySm" tone="subdued">
                            Connected {new Date(store.connectedAt).toLocaleDateString()}
                          </Text>
                        </BlockStack>
                      </BlockStack>
                    </div>
                    {/* Right: actions */}
                    <div style={{ flex: '0 0 auto' }}>
                      <InlineStack gap="200" blockAlign="center" wrap>
                        <Button
                          url={`https://${store.shop}`}
                          external
                          accessibilityLabel="Visit store"
                          size="slim"
                        >
                          Visit Store
                        </Button>
                        <Button
                          variant="secondary"
                          size="slim"
                          onClick={() => handleStoreDetail(store.id)}
                          accessibilityLabel="Store details"
                        >
                          Details
                        </Button>
                        <Button
                          variant="primary"
                          tone="critical"
                          size="slim"
                          onClick={() => {
                            if (typeof window !== 'undefined' && window.confirm('Disconnect this store?')) {
                              handleDisconnect(store.id);
                            }
                          }}
                          accessibilityLabel="Disconnect store"
                        >
                          Disconnect
                        </Button>
                      </InlineStack>
                    </div>
                  </div>
                </Card>
              ))}
            </BlockStack>
          )}
        </Layout.Section>
      </Layout>

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

      <Modal
        open={showStoreDetailModal}
        onClose={handleStoreDetailClose}
        title={selectedStore ? `${selectedStore.name} – Details` : 'Store Details'}
        primaryAction={{
          content: 'Save',
          onAction: handleStoreDetailSave,
        }}
      >
        <Modal.Section>
          <BlockStack gap="400">
            {selectedStore && (
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" fontWeight="semibold">
                  {selectedStore.shop}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Connected: {new Date(selectedStore.connectedAt).toLocaleDateString()}
                </Text>
              </BlockStack>
            )}
            <TextField
              label="Store description / notes"
              value={storeDescription}
              onChange={setStoreDescription}
              placeholder="Add notes about this store…"
              multiline={4}
              autoComplete="off"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
