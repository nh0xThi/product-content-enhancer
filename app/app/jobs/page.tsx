'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Upload,
  RotateCcw
} from 'lucide-react';
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Button,
  TextField,
  Select,
  Box,
  Text,
  Badge,
  EmptyState,
  Pagination,
  IndexTable,
} from '@shopify/polaris';
import type { IndexTableProps } from '@shopify/polaris';
import { StructureEditor } from '@/components/StructureEditor';
import { StructurePreview } from '@/components/StructurePreview';
import { useNotify } from '@/context/NotifyContext';
import { fetchWithSessionToken } from '@/lib/shopifyFetch';

interface Store {
  id: string;
  shop: string;
  name: string | null;
  status: string;
}

interface Job {
  id: string;
  productId: string;
  productTitle: string;
  productVendor: string | null;
  productType: string | null;
  status: string;
  productStatus?: 'content pass' | 'needed improve' | 'ai generated' | 'ai content imported' | 'imported';
  generatedHtml: string | null;
  dndData: any;
  originalProduct: any;
  createdAt: string;
  updatedAt: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'edit'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dndData, setDndData] = useState<any>(null);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [importingJobIds, setImportingJobIds] = useState<Set<string>>(new Set());
  const [importingBulk, setImportingBulk] = useState(false);
  const [undoingJobIds, setUndoingJobIds] = useState<Set<string>>(new Set());
  const [undoingBulk, setUndoingBulk] = useState(false);
  const editBaselineRef = useRef<string>('');
  const [selectedBatchItem, setSelectedBatchItem] = useState<any | null>(null);
  const [batchPreviewItemId, setBatchPreviewItemId] = useState<string | null>(null);
  const [importingBatchItemIds, setImportingBatchItemIds] = useState<Set<string>>(new Set());
  const [undoingBatchItemIds, setUndoingBatchItemIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());
  const notify = useNotify();

  useEffect(() => {
    fetchJobs();
  }, [statusFilter, selectedStoreId]);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const response = await fetchWithSessionToken('/api/stores');
      const data = await response.json();
      const activeStores = (data.stores || []).filter((store: Store) => store.status === 'active');
      setStores(activeStores);
      if (activeStores.length > 0 && !selectedStoreId) {
        setSelectedStoreId(activeStores[0].id);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (selectedStoreId) params.set('storeId', selectedStoreId);
      const url = params.toString() ? `/api/jobs?${params.toString()}` : '/api/jobs';
      const response = await fetch(url);
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportJobs = async (jobIds: string[]) => {
    if (!selectedStoreId) {
      notify.warning('Please select a store to import into.');
      return;
    }

    if (jobIds.length === 0) {
      notify.warning('Please select at least one job to import.');
      return;
    }

    const storeName = stores.find((store) => store.id === selectedStoreId)?.name
      || stores.find((store) => store.id === selectedStoreId)?.shop
      || 'the selected store';
    const totalProducts = jobIds.reduce((sum, id) => {
      const job = jobs.find((item) => item.id === id);
      if (!job) return sum + 1;
      const original = typeof job.originalProduct === 'string'
        ? (() => {
            try {
              return JSON.parse(job.originalProduct);
            } catch {
              return null;
            }
          })()
        : job.originalProduct;
      const batchCount = original?.batch && Array.isArray(original.products) ? original.products.length : 0;
      return sum + (batchCount || 1);
    }, 0);
    const confirmMessage = totalProducts === 1
      ? `Import new content for 1 product into ${storeName}? This will update the product description in the store.`
      : `Import new content for ${totalProducts} products into ${storeName}? This will update the product descriptions in the store.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setImportingBulk(true);
    setImportingJobIds((prev) => new Set(Array.from(prev).concat(jobIds)));

    try {
      const response = await fetch('/api/jobs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: selectedStoreId, jobIds }),
      });

      const data = await response.json();
      if (!response.ok) {
        notify.error(data.error || 'Import failed.');
        return;
      }

      const errorsCount = data.errors?.length || 0;
      const message = `Imported ${data.importedCount} of ${data.total} jobs.${errorsCount ? ` ${errorsCount} failed.` : ''}`;
      if (errorsCount) notify.warning(message);
      else notify.success(message);
      setSelectedJobIds(new Set());
      fetchJobs();
    } catch (error) {
      console.error('Error importing jobs:', error);
      notify.error('Error importing jobs.');
    } finally {
      setImportingBulk(false);
      setImportingJobIds((prev) => {
        const next = new Set(Array.from(prev));
        jobIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const handleUndoJobs = async (jobIds: string[]) => {
    if (!selectedStoreId) {
      notify.warning('Please select a store to undo.');
      return;
    }

    if (jobIds.length === 0) {
      notify.warning('Please select at least one job to undo.');
      return;
    }

    const totalProducts = jobIds.reduce((sum, id) => {
      const job = jobs.find((item) => item.id === id);
      if (!job) return sum + 1;
      const original = typeof job.originalProduct === 'string'
        ? (() => {
            try {
              return JSON.parse(job.originalProduct);
            } catch {
              return null;
            }
          })()
        : job.originalProduct;
      const batchCount = original?.batch && Array.isArray(original.products) ? original.products.length : 0;
      return sum + (batchCount || 1);
    }, 0);
    const undoMessage = totalProducts === 1
      ? 'Undo will restore the original product description. Continue?'
      : `Undo will restore the original descriptions for ${totalProducts} products. Continue?`;
    if (!confirm(undoMessage)) {
      return;
    }

    setUndoingBulk(true);
    setUndoingJobIds((prev) => new Set(Array.from(prev).concat(jobIds)));

    try {
      const response = await fetch('/api/jobs/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: selectedStoreId, jobIds }),
      });

      const data = await response.json();
      if (!response.ok) {
        notify.error(data.error || 'Undo failed.');
        return;
      }

      const errorsCount = data.errors?.length || 0;
      const message = `Restored ${data.restoredCount} of ${data.total} jobs.${errorsCount ? ` ${errorsCount} failed.` : ''}`;
      if (errorsCount) notify.warning(message);
      else notify.success(message);
      setSelectedJobIds(new Set());
      fetchJobs();
    } catch (error) {
      console.error('Error undoing jobs:', error);
      notify.error('Error undoing jobs.');
    } finally {
      setUndoingBulk(false);
      setUndoingJobIds((prev) => {
        const next = new Set(Array.from(prev));
        jobIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const handleViewJob = async (job: Job) => {
    setSelectedJob(job);
    // Ensure dndData is an object (it may be stored as a string)
    try {
      const parsedOriginal = typeof job.originalProduct === 'string'
        ? JSON.parse(job.originalProduct)
        : job.originalProduct;
      const batchItems = parsedOriginal?.batch && Array.isArray(parsedOriginal.products)
        ? parsedOriginal.products
        : null;
      if (batchItems && batchItems.length > 0) {
        const first = batchItems[0];
        const parsed = typeof first.dndData === 'string' ? JSON.parse(first.dndData) : first.dndData;
        const normalized = normalizeDndBrandLink(parsed, first.originalProduct || { vendor: first.productVendor });
        setDndData(normalized || { content: [], root: { props: {} } });
        setBatchPreviewItemId(first.productId || null);
        setSelectedBatchItem(null);
      } else {
        const parsed = typeof job.dndData === 'string' ? JSON.parse(job.dndData) : job.dndData;
        const normalized = normalizeDndBrandLink(parsed, job.originalProduct || { vendor: job.productVendor });
        setDndData(normalized || { content: [], root: { props: {} } });
        setBatchPreviewItemId(null);
        setSelectedBatchItem(null);
      }
    } catch (e) {
      setDndData({ content: [], root: { props: {} } });
      setBatchPreviewItemId(null);
      setSelectedBatchItem(null);
    }
    setViewMode('detail');
  };

  const handleEditJob = (job: Job) => {
    setSelectedJob(job);
    try {
      const parsed = typeof job.dndData === 'string' ? JSON.parse(job.dndData) : job.dndData;
      const normalized = normalizeDndBrandLink(parsed, job.originalProduct || { vendor: job.productVendor });
      setDndData(normalized || { content: [], root: { props: {} } });
      editBaselineRef.current = JSON.stringify(normalized || { content: [], root: { props: {} } });
    } catch (e) {
      setDndData({ content: [], root: { props: {} } });
      editBaselineRef.current = JSON.stringify({ content: [], root: { props: {} } });
    }
    setSelectedBatchItem(null);
    setViewMode('edit');
  };

  const handleEditBatchItem = (job: Job, item: any) => {
    setSelectedJob(job);
    setSelectedBatchItem(item);
    try {
      const parsed = typeof item.dndData === 'string' ? JSON.parse(item.dndData) : item.dndData;
      const normalized = normalizeDndBrandLink(parsed, item.originalProduct || { vendor: item.productVendor });
      setDndData(normalized || { content: [], root: { props: {} } });
      editBaselineRef.current = JSON.stringify(normalized || { content: [], root: { props: {} } });
    } catch (e) {
      setDndData({ content: [], root: { props: {} } });
      editBaselineRef.current = JSON.stringify({ content: [], root: { props: {} } });
    }
    setViewMode('edit');
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchJobs();
        if (selectedJob?.id === jobId) {
          setSelectedJob(null);
          setViewMode('list');
        }
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      notify.error('Error deleting job');
    }
  };

  const handleSaveJob = async () => {
    if (!selectedJob) return;
    if (selectedBatchItem) {
      try {
        const original = typeof selectedJob.originalProduct === 'string'
          ? JSON.parse(selectedJob.originalProduct)
          : selectedJob.originalProduct;
        const batchItems = original?.batch && Array.isArray(original.products)
          ? original.products
          : null;
        if (!batchItems) {
          notify.warning('Batch item data not found.');
          return;
        }

        const idx = batchItems.findIndex((item: any) => item?.productId === selectedBatchItem.productId);
        if (idx === -1) {
          notify.warning('Batch item not found.');
          return;
        }

        const html = renderDndToHtml(dndData);
        const plainText = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        const derivedStatus = plainText.length > 0 && plainText.length < 300 ? 'needed improve' : 'ai generated';
        const updatedItem = {
          ...batchItems[idx],
          dndData: dndData,
          generatedHtml: html || batchItems[idx].generatedHtml,
          productStatus: derivedStatus,
        };
        const updatedProducts = batchItems.slice();
        updatedProducts[idx] = updatedItem;
        const updatedOriginal = {
          ...original,
          products: updatedProducts,
        };

        const response = await fetch(`/api/jobs/${selectedJob.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalProduct: updatedOriginal,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setSelectedJob(data.job);
          setSelectedBatchItem(updatedItem);
          editBaselineRef.current = JSON.stringify(dndData || { content: [], root: { props: {} } });
          fetchJobs();
          notify.success('Batch item saved successfully!');
        } else {
          notify.error('Error saving batch item');
        }
      } catch (error) {
        console.error('Error saving batch item:', error);
        notify.error('Error saving batch item');
      }
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${selectedJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dndData: dndData,
          status: 'completed',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedJob(data.job);
        fetchJobs();
        editBaselineRef.current = JSON.stringify(dndData || { content: [], root: { props: {} } });
        notify.success('Job saved successfully!');
      }
    } catch (error) {
      console.error('Error saving job:', error);
      notify.error('Error saving job');
    }
  };

  const getStatusBadge = (status?: string, jobStatus?: string) => {
    const effectiveStatus = status || (jobStatus === 'completed' ? 'ai generated' : undefined);
    if (!effectiveStatus) return null;

    const statusConfig: Record<string, { label: string; tone: 'success' | 'warning' | 'info' | 'attention' | 'critical' }> = {
      'content pass': { label: 'Content Pass', tone: 'success' },
      'needed improve': { label: 'Needed Improve', tone: 'warning' },
      'ai generated': { label: 'AI Generated', tone: 'info' },
      'ai content imported': { label: 'AI Content Imported', tone: 'attention' },
      'imported': { label: 'AI Content Imported', tone: 'attention' },
    };

    const config = statusConfig[effectiveStatus] || statusConfig['needed improve'];
    return <Badge tone={config.tone}>{config.label}</Badge>;
  };

  const getBatchItems = (job?: Job | null) => {
    if (!job) return null;
    try {
      const original = typeof job.originalProduct === 'string'
        ? JSON.parse(job.originalProduct)
        : job.originalProduct;
      if (original?.batch && Array.isArray(original.products)) {
        return original.products;
      }
    } catch {
      return null;
    }
    return null;
  };

  const isBatchItemImported = (item: any) =>
    item?.productStatus === 'ai content imported' || item?.productStatus === 'imported';

  const refreshSelectedJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) return;
      const data = await response.json();
      if (!data?.job) return;
      setSelectedJob(data.job);
      if (batchPreviewItemId) {
        const items = getBatchItems(data.job) || [];
        const item = items.find((i: any) => i.productId === batchPreviewItemId) || items[0];
        if (item) {
          handlePreviewBatchItem(data.job, item);
        }
      }
    } catch (error) {
      console.error('Error refreshing job:', error);
    }
  };

  const handlePreviewBatchItem = (job: Job, item: any) => {
    setSelectedJob(job);
    setBatchPreviewItemId(item.productId || null);
    try {
      const parsed = typeof item.dndData === 'string' ? JSON.parse(item.dndData) : item.dndData;
      const normalized = normalizeDndBrandLink(parsed, item.originalProduct || { vendor: item.productVendor });
      setDndData(normalized || { content: [], root: { props: {} } });
    } catch {
      setDndData({ content: [], root: { props: {} } });
    }
  };

  const handleImportBatchItem = async (job: Job, item: any) => {
    if (!selectedStoreId) {
      notify.warning('Please select a store to import into.');
      return;
    }
    const storeName = stores.find((store) => store.id === selectedStoreId)?.name
      || stores.find((store) => store.id === selectedStoreId)?.shop
      || 'the selected store';
    if (!confirm(`Import new content for "${item.productTitle}" into ${storeName}?`)) {
      return;
    }

    const key = `${job.id}:${item.productId}`;
    setImportingBatchItemIds((prev) => new Set(Array.from(prev).concat(key)));
    try {
      const response = await fetch('/api/jobs/batch-item/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: selectedStoreId,
          jobId: job.id,
          productId: item.productId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        notify.error(data.error || 'Import failed.');
        return;
      }
      notify.success('Batch item imported.');
      fetchJobs();
      refreshSelectedJob(job.id);
    } catch (error) {
      console.error('Error importing batch item:', error);
      notify.error('Error importing batch item.');
    } finally {
      setImportingBatchItemIds((prev) => {
        const next = new Set(Array.from(prev));
        next.delete(key);
        return next;
      });
    }
  };

  const handleUndoBatchItem = async (job: Job, item: any) => {
    if (!selectedStoreId) {
      notify.warning('Please select a store to undo.');
      return;
    }
    if (!confirm(`Undo will restore the original description for "${item.productTitle}". Continue?`)) {
      return;
    }

    const key = `${job.id}:${item.productId}`;
    setUndoingBatchItemIds((prev) => new Set(Array.from(prev).concat(key)));
    try {
      const response = await fetch('/api/jobs/batch-item/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: selectedStoreId,
          jobId: job.id,
          productId: item.productId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        notify.error(data.error || 'Undo failed.');
        return;
      }
      notify.success('Batch item restored.');
      fetchJobs();
      refreshSelectedJob(job.id);
    } catch (error) {
      console.error('Error undoing batch item:', error);
      notify.error('Error undoing batch item.');
    } finally {
      setUndoingBatchItemIds((prev) => {
        const next = new Set(Array.from(prev));
        next.delete(key);
        return next;
      });
    }
  };

  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const handleOpenBatchItemFromList = (job: Job, item: any) => {
    setSelectedJob(job);
    handlePreviewBatchItem(job, item);
    setViewMode('detail');
  };

  const isJobImported = (job: Job) =>
    job.productStatus === 'ai content imported' || job.productStatus === 'imported';

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        job.productTitle.toLowerCase().includes(query) ||
        job.productVendor?.toLowerCase().includes(query) ||
        job.productType?.toLowerCase().includes(query)
      );
    });
  }, [jobs, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, jobs.length]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageJobs = filteredJobs.slice(startIndex, endIndex);
  const currentPageJobIds = new Set(pageJobs.map((job) => job.id));

  const handleSelectionChange = (
    selectionType: Parameters<NonNullable<IndexTableProps['onSelectionChange']>>[0],
    toggleType: boolean,
    selection?: string | [number, number]
  ) => {
    const next = new Set(selectedJobIds);

    if (selectionType === 'all' || selectionType === 'page') {
      if (toggleType) {
        currentPageJobIds.forEach((id) => next.add(id));
      } else {
        currentPageJobIds.forEach((id) => next.delete(id));
      }
      setSelectedJobIds(next);
      return;
    }

    if (selectionType === 'range' && Array.isArray(selection)) {
      const [start, end] = selection;
      pageJobs.slice(start, end + 1).forEach((job) => {
        if (toggleType) {
          next.add(job.id);
        } else {
          next.delete(job.id);
        }
      });
      setSelectedJobIds(next);
      return;
    }

    if (typeof selection === 'string') {
      if (toggleType) {
        next.add(selection);
      } else {
        next.delete(selection);
      }
      setSelectedJobIds(next);
    }
  };

  const normalizeDndBrandLink = (data: any, originalProduct: any): any => {
    if (!data || !data.content || !Array.isArray(data.content)) {
      return data;
    }

    const vendor = originalProduct?.vendor || originalProduct?.productVendor || '';
    const parsedContent = data.content.map((item: any) => {
      if (item?.type !== 'BrandLink' || !item?.props) return item;

      const brandName = (item.props.brandName || '').toString().trim();
      const url = (item.props.url || '').toString().trim();
      const isPlaceholderName = !brandName || brandName.toLowerCase() === 'brand name';
      const isPlaceholderUrl = !url || /example\.com/i.test(url);
      const urlHost = (() => {
        if (!url) return '';
        try {
          const cleaned = url.replace(/^https?:\/\//i, '').split('/')[0];
          return cleaned || '';
        } catch {
          return '';
        }
      })();

      return {
        ...item,
        props: {
          ...item.props,
          brandName: isPlaceholderName ? (vendor || urlHost || item.props.brandName) : item.props.brandName,
          url: isPlaceholderUrl ? '' : item.props.url,
        },
      };
    });

    return { ...data, content: parsedContent };
  };

  const renderDndToHtml = (data: any): string => {
    if (!data || !data.content || !Array.isArray(data.content)) {
      return '';
    }

    const htmlParts: string[] = [];

    data.content.forEach((item: any) => {
      if (!item?.type || !item?.props) return;
      const props = item.props || {};

      switch (item.type) {
        case 'HeroText': {
          const headline = props.headline || props.content || '';
          const subHeadline = props.subHeadline || '';
          if (!headline && !subHeadline) return;
          htmlParts.push(
            `<div>` +
            (headline ? `<h2>${headline}</h2>` : '') +
            (subHeadline ? `<p>${subHeadline}</p>` : '') +
            `</div>`
          );
          break;
        }
        case 'ShortDescription': {
          const content = props.content || '';
          if (!content) return;
          htmlParts.push(`<div><p>${content}</p></div>`);
          break;
        }
        case 'Features': {
          const content = Array.isArray(props.content) ? props.content : [];
          if (content.length === 0) return;
          const heading = props.emphasizeBenefits ? 'Key Benefits' : 'Features';
          const items = content.map((feature: any) => {
            const name = feature?.name ? `<h4>${feature.name}</h4>` : '';
            const descriptionText = feature?.description || feature?.detail || feature?.value || feature?.content || '';
            const description = descriptionText ? `<p>${descriptionText}</p>` : '';
            return `<li>${name}${description}</li>`;
          }).join('');
          htmlParts.push(`<div><h3>${heading}</h3><ul>${items}</ul></div>`);
          break;
        }
        case 'LongDescription': {
          const content = props.content || '';
          if (!content) return;
          const paragraphs = String(content)
            .split(/\n{2,}/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => `<p>${p}</p>`)
            .join('');
          htmlParts.push(`<div>${paragraphs || `<p>${content}</p>`}</div>`);
          break;
        }
        case 'TechnicalSpecifications': {
          const rows = Array.isArray(props.specifications) ? props.specifications : props.content;
          if (!Array.isArray(rows) || rows.length === 0) return;
          const body = rows.map((spec: any) => {
            const name = spec?.name || '';
            const value = spec?.value || '';
            const unit = spec?.unit ? ` ${spec.unit}` : '';
            return `<tr><td>${name}</td><td>${value}${unit}</td></tr>`;
          }).join('');
          htmlParts.push(
            `<h3>Technical Specifications</h3>` +
            `<table>` +
            `<thead><tr><th>Specification</th><th>Value</th></tr></thead>` +
            `<tbody>${body}</tbody>` +
            `</table>`
          );
          break;
        }
        case 'BrandLink': {
          const brandName = props.brandName || '';
          const url = props.url || '';
          const description = props.description || '';
          if (!brandName && !description) return;
          if (!url || /example\.com/i.test(url)) return;
          htmlParts.push(
            `<div>` +
            (url && brandName ? `<a href="${url}">${brandName}</a>` : brandName ? `<p>${brandName}</p>` : '') +
            (description ? `<p>${description}</p>` : '') +
            `</div>`
          );
          break;
        }
        case 'YouTubeEmbed': {
          const content = props.content || '';
          const caption = props.caption || '';
          if (!content) return;
          htmlParts.push(
            `<div>` +
            `<iframe src="${content}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` +
            (caption ? `<p>${caption}</p>` : '') +
            `</div>`
          );
          break;
        }
        default:
          break;
      }
    });

    return htmlParts.join('\n');
  };

  const rowMarkup: React.ReactElement[] = [];
  let rowPosition = 0;

  pageJobs.forEach((job) => {
    const batchItems = getBatchItems(job) || [];
    const isBatchRow = batchItems.length > 0;
    const isExpanded = expandedJobIds.has(job.id);

    rowMarkup.push(
      <IndexTable.Row
        id={job.id}
        key={job.id}
        selected={selectedJobIds.has(job.id)}
        position={rowPosition}
        onClick={() => {
          if (isBatchRow) {
            toggleJobExpansion(job.id);
          }
        }}
      >
        <IndexTable.Cell>
          <BlockStack gap="050">
            <Text as="span" fontWeight="semibold">
              {job.productTitle}
            </Text>
            {job.productType && (
              <Text as="span" variant="bodySm" tone="subdued">
                {job.productType}
              </Text>
            )}
          </BlockStack>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodySm">
            {job.productVendor || '-'}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {getStatusBadge(job.productStatus, job.status) || (
            <Text as="span" variant="bodySm" tone="subdued">
              -
            </Text>
          )}
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodySm" tone="subdued">
            {new Date(job.createdAt).toLocaleDateString()}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <InlineStack gap="200" align="end" blockAlign="center" wrap={false}>
            {isJobImported(job) ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUndoJobs([job.id]);
                }}
                disabled={undoingJobIds.has(job.id)}
                className="text-orange-600 hover:text-orange-900 p-2 hover:bg-orange-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Undo"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleImportJobs([job.id]);
                }}
                disabled={importingJobIds.has(job.id)}
                className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Import"
              >
                <Upload className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewJob(job);
              }}
              className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded"
              title="View"
            >
              <Eye className="w-4 h-4" />
            </button>
            {!isBatchRow && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditJob(job);
                }}
                className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteJob(job.id);
              }}
              className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </InlineStack>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
    rowPosition += 1;

    if (isBatchRow && isExpanded) {
      batchItems.forEach((item: any) => {
        const key = `${job.id}:${item.productId}`;
        const imported = isBatchItemImported(item);
        rowMarkup.push(
          <IndexTable.Row
            id={key}
            key={key}
            position={rowPosition}
            rowType="child"
            hideSelectable
          >
            <IndexTable.Cell>
              <BlockStack gap="050">
                <Text as="span" fontWeight="semibold">
                  {item.productTitle || item.productId}
                </Text>
                {item.productVendor && (
                  <Text as="span" variant="bodySm" tone="subdued">
                    {item.productVendor}
                  </Text>
                )}
              </BlockStack>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as="span" variant="bodySm" tone="subdued">
                {item.productVendor || '-'}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              {getStatusBadge(item.productStatus, item.status) || (
                <Text as="span" variant="bodySm" tone="subdued">
                  -
                </Text>
              )}
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as="span" variant="bodySm" tone="subdued">
                -
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <InlineStack gap="200" align="end" blockAlign="center" wrap={false}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenBatchItemFromList(job, item);
                  }}
                  className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded"
                  title="Compare"
                >
                  <Eye className="w-4 h-4" />
                </button>
                {imported ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUndoBatchItem(job, item);
                    }}
                    disabled={undoingBatchItemIds.has(key)}
                    className="text-orange-600 hover:text-orange-900 p-2 hover:bg-orange-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Undo"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImportBatchItem(job, item);
                    }}
                    disabled={importingBatchItemIds.has(key)}
                    className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Import"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditBatchItem(job, item);
                  }}
                  className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </InlineStack>
            </IndexTable.Cell>
          </IndexTable.Row>
        );
        rowPosition += 1;
      });
    }
  });

  if (viewMode === 'edit' && selectedJob && dndData) {
    const hasUnsavedChanges = () => {
      try {
        return JSON.stringify(dndData || { content: [], root: { props: {} } }) !== editBaselineRef.current;
      } catch {
        return true;
      }
    };

    return (
      <Page
        fullWidth
        title={selectedBatchItem ? 'Edit Batch Item' : 'Edit Job'}
        subtitle={selectedBatchItem?.productTitle || selectedJob.productTitle}
        backAction={{ content: 'Back', onAction: () => setViewMode('detail') }}
        primaryAction={{
          content: 'Save Changes',
          onAction: handleSaveJob,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setViewMode('detail'),
          },
          {
            content: 'Done',
            onAction: () => {
              if (hasUnsavedChanges() && typeof window !== 'undefined' && !window.confirm('You have unsaved changes. Leave anyway?')) return;
              setViewMode('list');
              setSelectedJob(null);
              setSelectedBatchItem(null);
              setBatchPreviewItemId(null);
            },
          },
        ]}
      >
        <Card>
          <Box padding="400">
            <StructureEditor
              data={dndData ?? { content: [], root: { props: {} } }}
              onChange={setDndData}
            />
          </Box>
        </Card>
      </Page>
    );
  }

  if (viewMode === 'detail' && selectedJob) {
    const batchItems = getBatchItems(selectedJob) || [];
    const isBatch = batchItems.length > 0;
    const previewItem = isBatch
      ? batchItems.find((item: any) => item.productId === batchPreviewItemId) || batchItems[0]
      : null;
    const derivedHtml = renderDndToHtml(dndData);
    const fallbackHtml = previewItem?.generatedHtml || selectedJob.generatedHtml || '';
    const htmlToShow = derivedHtml || fallbackHtml || '';
    const hasDndPreview = Boolean(dndData?.content?.length);
    return (
      <Page
        fullWidth
        title="Job Details"
        subtitle={selectedJob.productTitle}
        backAction={{
          content: 'Back to List',
          onAction: () => {
            setViewMode('list');
            setSelectedJob(null);
            setSelectedBatchItem(null);
            setBatchPreviewItemId(null);
          },
        }}
        primaryAction={{
          content: `Import ${isBatch ? 'Batch' : ''}`,
          onAction: () => handleImportJobs([selectedJob.id]),
          disabled: importingJobIds.has(selectedJob.id),
        }}
        secondaryActions={[
          {
            content: `Undo ${isBatch ? 'Batch' : ''}`,
            onAction: () => handleUndoJobs([selectedJob.id]),
            disabled: undoingJobIds.has(selectedJob.id),
          },
          ...(!isBatch
            ? [
                {
                  content: 'Edit',
                  onAction: () => handleEditJob(selectedJob),
                },
              ]
            : []),
        ]}
      >

        <div className="app-card-style app-scroll-area p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Product Title</label>
              <p className="mt-1 text-gray-900">{selectedJob.productTitle}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <div className="mt-1">
                {getStatusBadge(selectedJob.productStatus, selectedJob.status) || (
                  <span className="text-sm text-gray-500">-</span>
                )}
              </div>
            </div>
            {selectedJob.productVendor && (
              <div>
                <label className="text-sm font-medium text-gray-700">Vendor</label>
                <p className="mt-1 text-gray-900">{selectedJob.productVendor}</p>
              </div>
            )}
            {selectedJob.productType && (
              <div>
                <label className="text-sm font-medium text-gray-700">Product Type</label>
                <p className="mt-1 text-gray-900">{selectedJob.productType}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700">Created At</label>
              <p className="mt-1 text-gray-900">
                {new Date(selectedJob.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Updated At</label>
              <p className="mt-1 text-gray-900">
                {new Date(selectedJob.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
          {isBatch && (
            <div>
              <label className="text-sm font-medium text-gray-700">Batch Items</label>
              <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {batchItems.map((item: any) => {
                      const key = `${selectedJob.id}:${item.productId}`;
                      const imported = isBatchItemImported(item);
                      return (
                        <tr key={item.productId}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{item.productTitle || item.productId}</div>
                            {item.productVendor && (
                              <div className="text-xs text-gray-500">{item.productVendor}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(item.productStatus, item.status) || (
                              <span className="text-sm text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handlePreviewBatchItem(selectedJob, item)}
                                className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {imported ? (
                                <button
                                  onClick={() => handleUndoBatchItem(selectedJob, item)}
                                  disabled={undoingBatchItemIds.has(key)}
                                  className="text-orange-600 hover:text-orange-900 p-2 hover:bg-orange-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Undo"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleImportBatchItem(selectedJob, item)}
                                  disabled={importingBatchItemIds.has(key)}
                                  className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Import"
                                >
                                  <Upload className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleEditBatchItem(selectedJob, item)}
                                className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="flex flex-row gap-6">
            {htmlToShow && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2">
                  Generated HTML {previewItem?.productTitle ? `- ${previewItem.productTitle}` : ''}
                </label>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-[90vh] overflow-y-auto">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                    {htmlToShow}
                  </pre>
                </div>
              </div>
            )}

            {(hasDndPreview || htmlToShow) && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 ">
                  Preview {previewItem?.productTitle ? `- ${previewItem.productTitle}` : ''}
                </label>
                <div className="mt-1">
                  <div className="border border-gray-200 rounded-lg overflow-hidden p-4 bg-white">
                    {hasDndPreview ? (
                      <StructurePreview data={dndData} />
                    ) : (
                      <div
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: htmlToShow }}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page
      fullWidth
      title="Content Generation Jobs"
      subtitle="View, import, and manage generated content jobs."
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="500">
                <InlineStack gap="400" wrap>
                  <div className="min-w-[280px] flex-1">
                    <TextField
                      label="Search jobs"
                      labelHidden
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="Search by title, vendor, type..."
                      autoComplete="off"
                      clearButton
                      onClearButtonClick={() => setSearchQuery('')}
                    />
                  </div>
                  <Box minWidth="220px">
                    <Select
                      label="Store"
                      labelInline
                      options={[
                        { label: 'Select a store', value: '' },
                        ...stores.map((store) => ({
                          label: `${store.name || store.shop} (${store.shop})`,
                          value: store.id,
                        })),
                      ]}
                      value={selectedStoreId}
                      onChange={setSelectedStoreId}
                    />
                  </Box>
                  <InlineStack gap="200" blockAlign="end">
                    <Button
                      variant="secondary"
                      tone="success"
                      onClick={() => handleImportJobs(filteredJobs.map((job) => job.id))}
                      disabled={importingBulk || filteredJobs.length === 0}
                      accessibilityLabel="Import all"
                    >
                      Import All
                    </Button>
                    <Button
                      variant="primary"
                      tone="success"
                      onClick={() => handleImportJobs(Array.from(selectedJobIds))}
                      disabled={importingBulk || selectedJobIds.size === 0}
                      accessibilityLabel="Importing will update the product description in the selected store."
                    >
                      Import
                    </Button>
                    <Button
                      variant="primary"
                      tone="critical"
                      onClick={() => handleUndoJobs(Array.from(selectedJobIds))}
                      disabled={undoingBulk || selectedJobIds.size === 0}
                      accessibilityLabel="Undo will restore the original product description."
                    >
                      Undo
                    </Button>
                  </InlineStack>
                </InlineStack>
              </BlockStack>
            </Card>

            {loading ? (
              <Card>
                <Box padding="800">
                  <InlineStack gap="200" blockAlign="center">
                    <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--p-color-text-subdued)' }} />
                    <Text as="p" tone="subdued">Loading jobs…</Text>
                  </InlineStack>
                </Box>
              </Card>
            ) : filteredJobs.length === 0 ? (
              <Card>
                <EmptyState
                  heading="No jobs found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Generate content from the Generate page, or adjust your filters.</p>
                </EmptyState>
              </Card>
            ) : (
              <Card padding="0">
                  <IndexTable
                    itemCount={pageJobs.length}
                    resourceName={{ singular: 'job', plural: 'jobs' }}
                    selectedItemsCount={Array.from(selectedJobIds).filter((id) => currentPageJobIds.has(id)).length}
                    onSelectionChange={handleSelectionChange}
                    headings={[
                      { title: 'Product' },
                      { title: 'Vendor' },
                      { title: 'Status' },
                      { title: 'Created' },
                      { title: 'Actions', alignment: 'end' },
                    ]}
                  >
                    {rowMarkup}
                  </IndexTable>
              </Card>
            )}
            {!loading && filteredJobs.length > 0 && (
              <Card>
                  <InlineStack align='space-between' gap="500" blockAlign="center" wrap={false}>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {(() => {
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const endIndex = Math.min(startIndex + itemsPerPage, filteredJobs.length);
                        return `Showing ${startIndex + 1}–${endIndex} of ${filteredJobs.length} jobs`;
                      })()}
                    </Text>
                    <Pagination
                      hasPrevious={currentPage > 1}
                      onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      hasNext={currentPage < Math.ceil(filteredJobs.length / itemsPerPage)}
                      onNext={() =>
                        setCurrentPage((p) =>
                          Math.min(Math.ceil(filteredJobs.length / itemsPerPage), p + 1)
                        )
                      }
                      label={`Page ${currentPage} of ${Math.ceil(filteredJobs.length / itemsPerPage) || 1}`}
                    />
                  </InlineStack>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
