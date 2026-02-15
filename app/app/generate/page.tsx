'use client';

import { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Select,
  TextField,
  Spinner,
  Modal,
  Banner,
} from '@shopify/polaris';
import ProductsTable from '@/components/ProductsTable';
import { StructureBuilder } from '@/components/StructureBuilder';
import { StructurePreview } from '@/components/StructurePreview';
import { Product } from '@/types';
import { CheckIcon } from '@shopify/polaris-icons';
import { useNotify } from '@/context/NotifyContext';

interface Store {
  id: string;
  shop: string;
  name: string;
  description?: string;
}

interface Template {
  id: string;
  name: string;
  description?: string;
  data: any;
  createdAt: string;
  updatedAt: string;
}

type Step = 1 | 2 | 3;

function GeneratePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const basePath = useAppBasePath();
  const [isInIframe, setIsInIframe] = useState(false);
  const isEmbedded = basePath === '/app' && (Boolean(searchParams.get('host')) || isInIframe);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedStoreDescription, setSelectedStoreDescription] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dndData, setDndData] = useState<any>({ content: [], root: { props: {} } });
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showLoadTemplate, setShowLoadTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [estimatedTokens, setEstimatedTokens] = useState({ perProduct: 0, total: 0 });
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [productsCursor, setProductsCursor] = useState<string | null>(null);
  const [productsHasNext, setProductsHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [productsTotalCount, setProductsTotalCount] = useState<number | null>(null);
  const [currentPageProductIds, setCurrentPageProductIds] = useState<string[]>([]);
  const notify = useNotify();
  const autoFetchedStoreIdRef = useRef<string | null>(null);

  const getStoredDescription = (storeId: string) => {
    try {
      return localStorage.getItem(`storeDescription:${storeId}`) || '';
    } catch (error) {
      console.warn('Failed to read store description from localStorage:', error);
      return '';
    }
  };

  useEffect(() => {
    setIsInIframe(typeof window !== 'undefined' && window.top !== window.self);
    setFetchError(null);
    fetch('/api/stores')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load stores');
        return res.json();
      })
      .then((data) => {
        const mappedStores = (data.stores || []).map((store: Store) => ({
          ...store,
          description: getStoredDescription(store.id),
        }));
        setStores(mappedStores);
        if (mappedStores.length > 0) {
          setSelectedStore(mappedStores[0].id);
          setSelectedStoreDescription(mappedStores[0].description || '');
        }
      })
      .catch((err) => {
        console.error('Stores fetch error:', err);
        setFetchError(err instanceof Error ? err.message : 'Failed to load stores');
      });

    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleStoreChange = (storeId: string) => {
    setSelectedStore(storeId);
    const store = stores.find((item) => item.id === storeId);
    setSelectedStoreDescription(store?.description || '');
    setProducts([]);
    setSelectedProduct(null);
    setSelectedProductIds([]);
    setProductsCursor(null);
    setProductsHasNext(false);
    setProductsTotalCount(null);
    autoFetchedStoreIdRef.current = null;
  };

  const fetchProductsPage = async (cursor: string | null) => {
    if (!selectedStore) return;

    try {
      const params = new URLSearchParams({ storeId: selectedStore, limit: '250' });
      if (cursor) params.set('cursor', cursor);

      const response = await fetch(`/api/shopify/products?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      const mappedProducts = (data.products || []).map((product: Product) => {
        const rawStatus = (product.status || '').toString().toLowerCase();
        const descriptionText = (product.description || '').toString().trim();
        const hasDescription = descriptionText.length > 0;
        const isShortDescription = hasDescription && descriptionText.length < 300;

        const baseStatus =
          rawStatus === 'ai content imported' || rawStatus === 'imported'
            ? 'ai content imported'
            : rawStatus === 'ai generated'
              ? 'ai generated'
              : undefined;

        let derivedStatus: Product['status'] | undefined;
        let contentStatus: Product['contentStatus'] = null;

        // Priority: AI imported > AI generated > content quality
        if (baseStatus === 'ai content imported') {
          derivedStatus = 'ai content imported';
        } else if (baseStatus === 'ai generated') {
          derivedStatus = 'ai generated';
        } else if (hasDescription) {
          derivedStatus = isShortDescription ? 'needed improve' : 'content pass';
        } else {
          derivedStatus = 'needed improve';
        }

        if (derivedStatus === 'content pass') {
          contentStatus = 'Content Pass';
        } else if (derivedStatus === 'needed improve') {
          contentStatus = 'Needed Improve';
        } else if (derivedStatus === 'ai generated') {
          contentStatus = 'AI Content Generated';
        } else if (derivedStatus === 'ai content imported') {
          contentStatus = 'AI Content Imported';
        }

        return {
          ...product,
          status: derivedStatus || product.status,
          contentStatus,
        };
      });

      setProducts((prev) => (cursor ? [...prev, ...mappedProducts] : mappedProducts));
      setProductsHasNext(Boolean(data.pageInfo?.hasNextPage));
      setProductsCursor(data.pageInfo?.endCursor || null);
      if (!cursor && typeof data.totalCount === 'number') {
        setProductsTotalCount(data.totalCount);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setFetchError(error instanceof Error ? error.message : 'Failed to fetch products');
      throw error;
    }
  };

  const fetchProducts = async () => {
    if (!selectedStore) return;
    setLoading(true);
    setFetchError(null);
    try {
      await fetchProductsPage(null);
    } catch {
      // Errors already captured in fetchProductsPage
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isEmbedded || stores.length !== 1 || !selectedStore) return;
    if (autoFetchedStoreIdRef.current === selectedStore) return;
    autoFetchedStoreIdRef.current = selectedStore;
    void fetchProducts();
  }, [isEmbedded, stores, selectedStore]);

  const fetchMoreProducts = async () => {
    if (!selectedStore || !productsHasNext || loadingMore) return;
    setLoadingMore(true);
    try {
      await fetchProductsPage(productsCursor);
    } catch {
      // Errors already captured in fetchProductsPage
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchAllProducts = async () => {
    if (!selectedStore || loadingAll) return;
    if (!productsHasNext) return;
    const confirmLoad = confirm('Load all remaining products? This may take a while for large stores.');
    if (!confirmLoad) return;

    setLoadingAll(true);
    try {
      let nextCursor = productsCursor;
      let hasNext = productsHasNext;
      let pageCount = 0;

      while (hasNext) {
        await fetchProductsPage(nextCursor);
        pageCount += 1;
        if (pageCount > 200) {
          throw new Error('Product pagination exceeded safe limits.');
        }
        nextCursor = productsCursor;
        hasNext = productsHasNext;
      }
    } catch {
      // Errors already captured in fetchProductsPage
    } finally {
      setLoadingAll(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    // Don't auto-advance to next step - let user click "Next Step" button
  };

  const handleSelectAllLoaded = () => {
    const ids = products.map((product) => product.id);
    setSelectedProductIds(ids);
    if (!selectedProduct && products[0]) {
      setSelectedProduct(products[0]);
    }
  };

  const handleUnselectAllLoaded = () => {
    setSelectedProductIds([]);
  };

  const handleSelectCurrentPage = () => {
    if (currentPageProductIds.length === 0) return;
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      currentPageProductIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
    if (!selectedProduct) {
      const first = filteredProducts.find((product) => currentPageProductIds.includes(product.id));
      if (first) {
        setSelectedProduct(first);
      }
    }
  };

  const handleUnselectCurrentPage = () => {
    if (currentPageProductIds.length === 0) return;
    setSelectedProductIds((prev) => prev.filter((id) => !currentPageProductIds.includes(id)));
  };
  const handleNextStep = () => {
    if (currentStep === 1 && dndData && dndData.content && dndData.content.length > 0) {
      setCurrentStep(2);
    } else if (currentStep === 2 && selectedProduct) {
      setCurrentStep(3);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !dndData) return;

    setSavingTemplate(true);
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          data: dndData,
        }),
      });

      if (response.ok) {
        await fetchTemplates();
        setShowSaveTemplate(false);
        setTemplateName('');
        setTemplateDescription('');
        notify.success('Template saved successfully!');
      } else {
        notify.error('Error saving template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      notify.error('Error saving template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleLoadTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}`);
      const data = await response.json();

      if (data.template) {
        setDndData(data.template.data);
        setShowLoadTemplate(false);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      notify.error('Error loading template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTemplates();
      } else {
        notify.error('Error deleting template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      notify.error('Error deleting template');
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    }
  };

  const handleGenerateContent = async () => {
    if (!dndData) return;

    const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id));
    const targets = selectedProducts.length > 0
      ? selectedProducts
      : selectedProduct
        ? [selectedProduct]
        : [];

    if (targets.length === 0) return;

    setGenerating(true);
    try {
      if (targets.length > 1) {
        const structure = dndData.content.map((component: any) => ({
          type: component.type,
          props: component.props,
        }));

        const storePrompt = selectedStoreDescription
          ? `Store Description: ${selectedStoreDescription}`
          : '';
        const combinedPrompt = [storePrompt, aiPrompt].filter(Boolean).join('\n');

        const chunkSize = 25;
        let offset = 0;
        const ids = targets.map((product) => product.id);

        while (offset < ids.length) {
          const response = await fetch('/api/bulk-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storeId: selectedStore,
              structure: JSON.stringify({ content: structure }),
              customPrompt: combinedPrompt || undefined,
              selection: {
                mode: 'ids',
                ids,
                offset,
                limit: chunkSize,
              },
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data?.error || 'Bulk generation failed.');
          }

          if (!data.processedCount) break;
          offset = typeof data.nextOffset === 'number' ? data.nextOffset : offset + data.processedCount;
        }

        try {
          const key = 'tokenUsageTotal';
          const current = Number(localStorage.getItem(key) || '0');
          const next = current + estimatedTokens.total;
          localStorage.setItem(key, String(next));
          window.dispatchEvent(new Event('tokenUsageUpdated'));
        } catch (err) {
          console.warn('Failed to persist token usage:', err);
        }

        notify.success('Bulk generation started. Check the Jobs page for progress.');
        router.push(`${basePath}/jobs`);
        return;
      }

      // Extract component structure for generation
      const structure = dndData.content.map((component: any) => ({
        type: component.type,
        props: component.props,
      }));

      const storePrompt = selectedStoreDescription
        ? `Store Description: ${selectedStoreDescription}`
        : '';
      const combinedPrompt = [storePrompt, aiPrompt].filter(Boolean).join('\n');

      const response = await fetch('/api/perplexity/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: selectedStore,
          products: targets,
          structure: JSON.stringify({ content: structure }),
          customPrompt: combinedPrompt || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        try {
          const key = 'tokenUsageTotal';
          const current = Number(localStorage.getItem(key) || '0');
          const next = current + estimatedTokens.total;
          localStorage.setItem(key, String(next));
          window.dispatchEvent(new Event('tokenUsageUpdated'));
        } catch (err) {
          console.warn('Failed to persist token usage:', err);
        }
        // Update dnd data with generated content if available (single case)
        if (data.dndData) {
          setDndData(data.dndData);
        }
        notify.success('Content generated successfully.');
        router.push(`${basePath}/jobs`);
        return;
      }

      if (data.error) {
        notify.error(data.error);
      } else {
        notify.error('Content generation failed. Please try again.');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      notify.error('Error generating content. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const filteredProducts = useMemo(() => {
    let results = products;

    // Filter by status
    if (statusFilter !== 'all') {
      results = results.filter((p) => {
        const prodStatus = (p.status || '').toLowerCase();
        const normalized = prodStatus === 'imported' ? 'ai content imported' : prodStatus;
        return normalized === statusFilter.toLowerCase();
      });
    }

    // Filter by vendor
    if (vendorFilter !== 'all') {
      results = results.filter((p) => (p.vendor || '').toLowerCase() === vendorFilter.toLowerCase());
    }

    // Filter by type
    if (typeFilter !== 'all') {
      results = results.filter((p) => (p.productType || '').toLowerCase() === typeFilter.toLowerCase());
    }

    // Filter by search query
    if (searchQuery) {
      results = results.filter((product) =>
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return results;
  }, [products, searchQuery, statusFilter, vendorFilter, typeFilter]);

  const estimateTokensFromText = (text: string) => {
    if (!text) return 0;
    return Math.max(1, Math.ceil(text.length / 4));
  };

  const generationTokenEstimate = useMemo(() => {
    const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id));
    const targets = selectedProducts.length > 0
      ? selectedProducts
      : selectedProduct
        ? [selectedProduct]
        : [];

    if (!dndData || targets.length === 0) {
      return { perProduct: 0, total: 0 };
    }

    const structure = {
      content: (dndData?.content || []).map((component: any) => ({
        type: component.type,
        props: component.props,
      })),
    };
    const structureText = JSON.stringify(structure);
    const storePrompt = selectedStoreDescription
      ? `Store Description: ${selectedStoreDescription}`
      : '';
    const promptBase = [
      'Generate product content with the provided structure.',
      `Structure: ${structureText}`,
      storePrompt,
      aiPrompt ? `Custom Instructions: ${aiPrompt}` : '',
    ].filter(Boolean).join('\n');

    const perProductTokens = targets.reduce((sum, product) => {
      const productText = [
        `Title: ${product.title}`,
        `Vendor: ${product.vendor || 'Unknown'}`,
        `Type: ${product.productType || 'Unknown'}`,
        `Description: ${product.description || ''}`,
      ].join('\n');
      return sum + estimateTokensFromText(promptBase + '\n' + productText);
    }, 0);

    const perProduct = Math.ceil(perProductTokens / targets.length);
    const total = perProduct * targets.length;
    return { perProduct, total };
  }, [products, selectedProductIds, selectedProduct, dndData, aiPrompt, selectedStoreDescription]);

  useEffect(() => {
    setEstimatedTokens(generationTokenEstimate);
  }, [generationTokenEstimate]);

  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const statusConfig: Record<string, { label: string; className: string }> = {
      'content pass': {
        label: 'Content Pass',
        className: 'bg-green-100 text-green-800',
      },
      'needed improve': {
        label: 'Needed Improve',
        className: 'bg-yellow-100 text-yellow-800',
      },
      'ai generated': {
        label: 'AI Generated',
        className: 'bg-blue-100 text-blue-800',
      },
      'ai content imported': {
        label: 'AI Content Imported',
        className: 'bg-purple-100 text-purple-800',
      },
      'imported': {
        label: 'AI Content Imported',
        className: 'bg-purple-100 text-purple-800',
      },
    };

    const config = statusConfig[status] || statusConfig['needed improve'];

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const canProceedToStep2 = dndData !== null && dndData.content && dndData.content.length > 0;
  const canProceedToStep3 = selectedProduct !== null;
  const canSelectAllLoaded = products.length > 0;
  const canSelectCurrentPage = currentPageProductIds.length > 0;
  const allLoadedSelected = canSelectAllLoaded && selectedProductIds.length === products.length;
  const allCurrentPageSelected =
    canSelectCurrentPage && currentPageProductIds.every((id) => selectedProductIds.includes(id));

  return (
    <Page
      fullWidth
      title="Generate content"
      subtitle="Build structure, select a product, and generate enhanced content."
      backAction={currentStep > 1 ? { content: 'Back', onAction: handlePreviousStep } : undefined}
    >
      <Layout>
        {fetchError ? (
          <Layout.Section>
            <Banner tone="critical" onDismiss={() => setFetchError(null)}>
              {fetchError}
            </Banner>
          </Layout.Section>
        ) : null}

        {/* Step 1: Structure */}
        {currentStep === 1 && (
          <>
            <Layout.Section>
              <InlineStack gap="400" blockAlign="center" align="end">
                <Button variant="secondary" onClick={handlePreviousStep}>Back</Button>
                <Button variant="primary" onClick={handleNextStep} disabled={!canProceedToStep2}>
                  Continue
                </Button>
              </InlineStack>
            </Layout.Section>
            <Layout.Section>
              <Card>
                <BlockStack gap="500">
                  <InlineStack align="space-between" gap="400" blockAlign="center" wrap={false}>
                    <BlockStack gap="100">
                      <Text as="p" tone="subdued">
                        Build your content structure or load a saved template.
                      </Text>
                    </BlockStack>
                    <InlineStack gap="300" wrap={false}>
                      <Button onClick={() => setShowLoadTemplate(true)}>
                        Load template
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => setShowSaveTemplate(true)}
                        disabled={!dndData?.content?.length}
                      >
                        Save template
                      </Button>
                    </InlineStack>
                  </InlineStack>
                  <Box paddingBlockStart="300" paddingBlockEnd="300" minWidth="0" width="100%">
                    <StructureBuilder data={dndData} onChange={setDndData} />
                  </Box>
                </BlockStack>
              </Card>
            </Layout.Section>
            <Layout.Section>
              <InlineStack gap="400" blockAlign="center" align="end">
                <Button onClick={handlePreviousStep}>Back</Button>
                <Button variant="primary" onClick={handleNextStep} disabled={!canProceedToStep2}>
                  Continue
                </Button>
              </InlineStack>
            </Layout.Section>
          </>
        )}

        {/* Step 2: Select Store & Product */}
        {currentStep === 2 && (
          <>
            <Layout.Section>
              <Card>
                <BlockStack gap="500">
                  <Text as="h2" variant="headingLg">Select product</Text>
                  <Text as="p" tone="subdued">Choose a store, fetch products, then select a product to enhance.</Text>
                  <InlineStack gap="300" blockAlign="end" wrap>
                    {isEmbedded ? (
                      <>
                        <Text as="p" tone="subdued">
                          Store: {stores.find((s) => s.id === selectedStore)?.name || 'Connected store'}
                          {stores.find((s) => s.id === selectedStore)?.shop
                            ? ` (${stores.find((s) => s.id === selectedStore)?.shop})`
                            : ''}
                        </Text>
                        <Button variant="primary" loading={loading} disabled={!selectedStore} onClick={fetchProducts}>
                          Fetch products
                        </Button>
                      </>
                    ) : (
                      <>
                        <Box minWidth="220px">
                          <Select
                            label="Store"
                            labelInline
                            options={[
                              { label: 'Select a store', value: '' },
                              ...stores.map((s) => ({ label: `${s.name} (${s.shop})`, value: s.id })),
                            ]}
                            value={selectedStore}
                            onChange={handleStoreChange}
                          />
                        </Box>
                        <Button variant="primary" loading={loading} disabled={!selectedStore} onClick={fetchProducts}>
                          Fetch products
                        </Button>
                      </>
                    )}
                  </InlineStack>
                  {selectedStoreDescription ? (
                    <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                      <BlockStack gap="100">
                        <Text as="p" variant="bodySm" fontWeight="semibold">Store description</Text>
                        <Text as="p" variant="bodySm" tone="subdued">{selectedStoreDescription}</Text>
                      </BlockStack>
                    </Box>
                  ) : null}
                </BlockStack>
              </Card>
            </Layout.Section>
            <Layout.Section>
              <Card>
                <BlockStack gap="500">
                  <InlineStack gap="300" wrap align="space-between">
                    <InlineStack gap="200" blockAlign="center" wrap>
                      <Button
                        onClick={allLoadedSelected ? handleUnselectAllLoaded : handleSelectAllLoaded}
                        disabled={!canSelectAllLoaded}
                        variant="tertiary"
                      >
                        {allLoadedSelected ? 'Unselect all loaded' : 'Select all loaded'}
                      </Button>
                      <Button
                        onClick={allCurrentPageSelected ? handleUnselectCurrentPage : handleSelectCurrentPage}
                        disabled={!canSelectCurrentPage}
                        variant="tertiary"
                      >
                        {allCurrentPageSelected ? 'Unselect current page' : 'Select current page'}
                      </Button>
                      <Text as="span" variant="bodySm" tone="subdued">
                        Selected: {selectedProductIds.length.toLocaleString()}
                      </Text>
                    </InlineStack>
                    <InlineStack gap="300" wrap>
                      <Box minWidth="280px">
                        <TextField
                          label="Search products"
                          value={searchQuery}
                          onChange={setSearchQuery}
                          placeholder="Search by title, description, handle..."
                          autoComplete="off"
                          clearButton
                          onClearButtonClick={() => setSearchQuery('')}
                        />
                      </Box>
                      <Box minWidth="160px">
                        <Select
                          label="Status"
                          options={[
                            { label: 'All', value: 'all' },
                            { label: 'Content Pass', value: 'content pass' },
                            { label: 'Needed Improve', value: 'needed improve' },
                            { label: 'AI Generated', value: 'ai generated' },
                            { label: 'AI Imported', value: 'ai content imported' },
                          ]}
                          value={statusFilter}
                          onChange={setStatusFilter}
                        />
                      </Box>
                      <Box minWidth="160px">
                        <Select
                          label="Vendor"
                          options={[
                            { label: 'All', value: 'all' },
                            ...Array.from(new Set(products.map((p) => p.vendor).filter(Boolean))).map((v) => ({ label: String(v), value: String(v) })),
                          ]}
                          value={vendorFilter}
                          onChange={setVendorFilter}
                        />
                      </Box>
                      <Box minWidth="160px">
                        <Select
                          label="Product type"
                          options={[
                            { label: 'All', value: 'all' },
                            ...Array.from(new Set(products.map((p) => p.productType).filter(Boolean))).map((t) => ({ label: String(t), value: String(t) })),
                          ]}
                          value={typeFilter}
                          onChange={setTypeFilter}
                        />
                      </Box>
                    </InlineStack>
                  </InlineStack>
                  {loading ? (
                    <Box padding="800">
                      <InlineStack gap="200" blockAlign="center">
                        <Spinner size="large" />
                        <Text as="p" tone="subdued">Loading products…</Text>
                      </InlineStack>
                    </Box>
                  ) : filteredProducts.length === 0 ? (
                    <Box padding="800">
                      <Text as="p" tone="subdued">
                        {products.length === 0 ? 'Click “Fetch products” to load products from your store.' : 'No products match your filters or search.'}
                      </Text>
                    </Box>
                  ) : (
                    <div className="app-scroll-area min-h-[200px]">
                      <ProductsTable
                        products={filteredProducts}
                        onProductSelect={handleProductSelect}
                        selectedProductId={selectedProduct?.id}
                        selectedProductIds={selectedProductIds}
                        onSelectionChange={setSelectedProductIds}
                        totalProductsCount={productsTotalCount ?? undefined}
                        onCurrentPageIdsChange={setCurrentPageProductIds}
                      />
                    </div>
                  )}
                  {productsHasNext && !loading && (
                    <InlineStack align="center" gap="200">
                      <Button
                        onClick={fetchMoreProducts}
                        loading={loadingMore}
                        disabled={loadingMore || loadingAll}
                        variant="secondary"
                      >
                        Load more products
                      </Button>
                      <Button
                        onClick={fetchAllProducts}
                        loading={loadingAll}
                        disabled={loadingMore || loadingAll}
                        variant="secondary"
                      >
                        Load all products
                      </Button>
                    </InlineStack>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
            <Layout.Section>
              <InlineStack gap="300" blockAlign="center" align="end">
                <Button onClick={handlePreviousStep}>Back</Button>
                <Button variant="primary" onClick={handleNextStep} disabled={!canProceedToStep3}>
                  Continue
                </Button>
              </InlineStack>
            </Layout.Section>
          </>
        )}

        {/* Step 3: Adjust Prompt and Generate */}
        {currentStep === 3 && (
          <>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingLg">Generate content</Text>
                  <Text as="p" tone="subdued">Review your structure and adjust the AI prompt if needed, then generate your content.</Text>
                  {selectedStoreDescription ? (
                    <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                      <BlockStack gap="100">
                        <Text as="p" variant="bodySm" fontWeight="semibold">About the store</Text>
                        <Text as="p" variant="bodySm" tone="subdued">{selectedStoreDescription}</Text>
                      </BlockStack>
                    </Box>
                  ) : null}
                  <TextField
                    label="Custom AI instructions (optional)"
                    value={aiPrompt}
                    onChange={setAiPrompt}
                    placeholder="Add specific instructions (e.g. tone, style, focus areas, banned terms)..."
                    multiline={4}
                    autoComplete="off"
                    helpText="Leave empty to use default instructions based on your content structure."
                  />
                  <Banner tone="info">
                    The AI will generate content based on your selected structure and product information.
                  </Banner>
                </BlockStack>
              </Card>
            </Layout.Section>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">Structure preview</Text>
                  <Box minHeight="300px" padding="300" background="bg-surface-secondary" borderRadius="200">
                    <div className="app-scroll-area" style={{ maxHeight: 'min(55vh, 420px)' }}>
                      <StructurePreview data={dndData} className="p-4" />
                    </div>
                  </Box>
                </BlockStack>
              </Card>
            </Layout.Section>
            <Layout.Section>
              <InlineStack gap="400" blockAlign="center">
                <Button onClick={handlePreviousStep}>Back</Button>
                <Button
                  variant="primary"
                  tone="success"
                  onClick={handleGenerateContent}
                  disabled={generating || !dndData}
                  loading={generating}
                >
                  {selectedProductIds.length > 1 ? `Generate ${selectedProductIds.length} products` : 'Generate content'}
                </Button>
                {estimatedTokens.total > 0 ? (
                  <Text as="span" variant="bodySm" tone="subdued">
                    Est. tokens: {estimatedTokens.perProduct.toLocaleString()} / product · {estimatedTokens.total.toLocaleString()} total
                  </Text>
                ) : null}
              </InlineStack>
            </Layout.Section>
          </>
        )}

        <Modal
          open={showSaveTemplate}
          onClose={() => {
            setShowSaveTemplate(false);
            setTemplateName('');
            setTemplateDescription('');
          }}
          title="Save template"
          primaryAction={{
            content: 'Save',
            loading: savingTemplate,
            onAction: () => { void handleSaveTemplate(); },
            disabled: !templateName.trim(),
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => {
                setShowSaveTemplate(false);
                setTemplateName('');
                setTemplateDescription('');
              },
            },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <TextField
                label="Template name"
                value={templateName}
                onChange={setTemplateName}
                placeholder="e.g. Product page standard"
                autoComplete="off"
              />
              <TextField
                label="Description (optional)"
                value={templateDescription}
                onChange={setTemplateDescription}
                placeholder="Describe this template..."
                multiline={3}
                autoComplete="off"
              />
            </BlockStack>
          </Modal.Section>
        </Modal>

        <Modal
          open={showLoadTemplate}
          onClose={() => setShowLoadTemplate(false)}
          title="Load template"
          size="large"
        >
          <Modal.Section>
            {templates.length === 0 ? (
              <BlockStack gap="300">
                <Text as="p" tone="subdued">No templates saved yet.</Text>
                <Text as="p" variant="bodySm" tone="subdued">Create and save a template from step 1 to reuse it later.</Text>
              </BlockStack>
            ) : (
              <BlockStack gap="200">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <BlockStack gap="200">
                      <InlineStack gap="300" blockAlign="end" align="space-between">
                        <Box minWidth="0">
                          <button
                            type="button"
                            onClick={() => handleLoadTemplate(template.id)}
                            style={{ textAlign: 'start', cursor: 'pointer', background: 'none', border: 'none', width: '100%', padding: 0 }}
                          >
                            <BlockStack gap="100">
                              <Text as="p" variant="bodyMd" fontWeight="semibold">{template.name}</Text>
                              {template.description ? (
                                <Text as="p" variant="bodySm" tone="subdued">{template.description}</Text>
                              ) : null}
                              <Text as="p" variant="bodySm" tone="subdued">
                                Updated: {new Date(template.updatedAt).toLocaleDateString()}
                              </Text>
                            </BlockStack>
                          </button>
                        </Box>
                        <Button
                          variant="plain"
                          tone="critical"
                          onClick={() => handleDeleteTemplate(template.id)}
                          accessibilityLabel="Delete template"
                        >
                          Delete
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Card>
                ))}
              </BlockStack>
            )}
          </Modal.Section>
        </Modal>
      </Layout>
    </Page>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div />}>
      <GeneratePageContent />
    </Suspense>
  );
}
