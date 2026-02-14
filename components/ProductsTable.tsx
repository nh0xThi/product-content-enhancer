'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Badge,
  BlockStack,
  Box,
  Card,
  IndexTable,
  InlineStack,
  Pagination,
  Text,
  Thumbnail,
} from '@shopify/polaris';
import type { IndexTableProps } from '@shopify/polaris';
import { ImageIcon } from '@shopify/polaris-icons';
import { Product } from '@/types';

interface ProductsTableProps {
  products: Product[];
  onProductSelect?: (product: Product) => void;
  selectedProductId?: string | null;
  selectedProductIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  totalProductsCount?: number;
  onCurrentPageIdsChange?: (ids: string[]) => void;
}

export default function ProductsTable({
  products,
  onProductSelect,
  selectedProductId: _selectedProductId,
  selectedProductIds,
  onSelectionChange,
  totalProductsCount,
  onCurrentPageIdsChange,
}: ProductsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate pagination
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageProducts = products.slice(startIndex, endIndex);

  // Get current page product IDs
  const currentPageProductIds = useMemo(
    () => new Set(currentPageProducts.map(p => p.id)),
    [currentPageProducts]
  );

  // Check if all current page products are selected
  const allCurrentPageSelected =
    currentPageProducts.length > 0 &&
    currentPageProducts.every(p => (selectedProductIds ?? []).includes(p.id));

  const selectedProducts = useMemo(
    () => new Set(selectedProductIds ?? []),
    [selectedProductIds]
  );

  const handleSelectProduct = (productId: string, product?: Product) => {
    if (!onSelectionChange) return;
    const newSelected = new Set(selectedProductIds ?? []);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
      // When checking a checkbox, also select the product
      if (product && onProductSelect) {
        onProductSelect(product);
      }
    }
    onSelectionChange(Array.from(newSelected));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleSelectionChange = (
    selectionType: Parameters<NonNullable<IndexTableProps['onSelectionChange']>>[0],
    toggleType: boolean,
    selection?: string | [number, number]
  ) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedProductIds ?? []);

    if (selectionType === 'all' || selectionType === 'page') {
      if (toggleType) {
        currentPageProductIds.forEach((id) => next.add(id));
      } else {
        currentPageProductIds.forEach((id) => next.delete(id));
      }
      onSelectionChange(Array.from(next));
      return;
    }

    if (selectionType === 'range' && Array.isArray(selection)) {
      const [start, end] = selection;
      currentPageProducts.slice(start, end + 1).forEach((product) => {
        if (toggleType) {
          next.add(product.id);
        } else {
          next.delete(product.id);
        }
      });
      onSelectionChange(Array.from(next));
      return;
    }

    if (typeof selection === 'string') {
      if (toggleType) {
        next.add(selection);
      } else {
        next.delete(selection);
      }
      onSelectionChange(Array.from(next));
    }
  };

  const lastPageIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!onCurrentPageIdsChange) return;
    const ids = currentPageProducts.map((product) => product.id);
    const prev = lastPageIdsRef.current;
    let hasDiff = prev.length !== ids.length;
    if (!hasDiff) {
      for (let i = 0; i < ids.length; i += 1) {
        if (ids[i] !== prev[i]) {
          hasDiff = true;
          break;
        }
      }
    }
    if (!hasDiff) return;
    lastPageIdsRef.current = ids;
    onCurrentPageIdsChange(ids);
  }, [currentPageProducts, onCurrentPageIdsChange]);

  const getStatusBadge = (status?: Product['status']) => {
    if (!status) return null;

    const statusConfig: Record<string, { label: string; tone: 'success' | 'warning' | 'info' | 'attention' }> = {
      'content pass': {
        label: 'Content Pass',
        tone: 'success',
      },
      'needed improve': {
        label: 'Needed Improve',
        tone: 'warning',
      },
      'ai generated': {
        label: 'AI Content Generated',
        tone: 'info',
      },
      'ai content imported': {
        label: 'AI Content Imported',
        tone: 'attention',
      },
      'imported': {
        label: 'AI Content Imported',
        tone: 'attention',
      },
    };

    const config = statusConfig[status] || statusConfig['needed improve'];

    return <Badge tone={config.tone}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card padding="0">
        {currentPageProducts.length === 0 ? (
          <Box padding="400">
            <Text as="p">No products found</Text>
          </Box>
        ) : (
          <IndexTable
            itemCount={currentPageProducts.length}
            resourceName={{ singular: 'product', plural: 'products' }}
            selectedItemsCount={Array.from(selectedProducts).filter((id) => currentPageProductIds.has(id)).length}
            onSelectionChange={handleSelectionChange}
            headings={[
              { title: 'Product' },
              { title: 'Tags' },
              { title: 'Status' },
            ]}
          >
            {currentPageProducts.map((product, index) => {
              const isSelected = selectedProducts.has(product.id);

              return (
                <IndexTable.Row
                  id={product.id}
                  key={product.id}
                  selected={isSelected}
                  position={index}
                  onClick={() => {
                    onProductSelect?.(product);
                    if (!isSelected) {
                      handleSelectProduct(product.id, product);
                    }
                  }}
                >
                  <IndexTable.Cell>
                    <InlineStack gap="300" blockAlign="center" wrap={false}>
                      {product.images && product.images.length > 0 ? (
                        <Thumbnail
                          size="small"
                          source={product.images[0].url}
                          alt={product.images[0].alt || product.title}
                        />
                      ) : (
                        <Thumbnail
                          size="small"
                          source={ImageIcon}
                          alt="No image"
                        />
                      )}
                      <BlockStack gap="050">
                        <Text as="span" fontWeight="semibold">
                          {product.title}
                        </Text>
                        {product.description && (
                          <Text as="span" variant="bodySm" tone="subdued">
                            {product.description.slice(0, 90)}
                            {product.description.length > 60 ? '...' : ''}
                          </Text>
                        )}
                      </BlockStack>
                    </InlineStack>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <InlineStack gap="100" wrap>
                      {product.tags && product.tags.length > 0 ? (
                        product.tags.slice(0, 3).map((tag, tagIndex) => (
                          <Badge key={tagIndex} tone="info">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <Text as="p" tone="subdued" variant="bodySm">
                          No tags
                        </Text>
                      )}
                      {product.tags && product.tags.length > 3 && (
                        <Badge tone="info">
                          {`+${product.tags.length - 3}`}
                        </Badge>
                      )}
                    </InlineStack>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    {getStatusBadge(product.status) || (
                      <Text as="span" tone="subdued" variant="bodySm">
                        -
                      </Text>
                    )}
                  </IndexTable.Cell>
                </IndexTable.Row>
              );
            })}
          </IndexTable>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <InlineStack align="space-between" blockAlign="center" wrap>
            <Text as="p" variant="bodySm" tone="subdued">
              Showing {startIndex + 1} to {Math.min(endIndex, products.length)} of {totalProductsCount ?? products.length} products
            </Text>
            <Pagination
              hasPrevious={currentPage > 1}
              onPrevious={() => handlePageChange(currentPage - 1)}
              hasNext={currentPage < totalPages}
              onNext={() => handlePageChange(currentPage + 1)}
            />
            <Pagination
              hasPrevious={currentPage > 1}
              onPrevious={() => handlePageChange(currentPage - 1)}
              hasNext={currentPage < totalPages}
              onNext={() => handlePageChange(currentPage + 1)}
              label={`Page ${currentPage} of ${totalPages}`}
            />
          </InlineStack>
        </Card>
      )}
    </div>
  );
}
