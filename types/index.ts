type ContentStatus = 'Content Pass' | 'Needed Improve' | 'AI Content Generated' | 'AI Content Imported' | null;
type ProductStatus = 'content pass' | 'needed improve' | 'ai generated' | 'ai content imported' | 'imported';

interface Product {
    id: string;
    title: string;
    description?: string;
    image?: string;
    price?: string;
    handle?: string;
    vendor?: string;
    productType?: string;
    tags?: string[];
    images?: Array<{ id: string; url: string; alt?: string }>;
    contentStatus?: ContentStatus;
    status?: ProductStatus;
  }
  
  interface GenerationResult {
    productId: string;
    success: boolean;
    content?: Record<string, string>;
    error?: string;
    originalData?: {
      title: string;
      description: string;
      tags: string[];
      images: Array<{ id: string; url: string; alt: string }>;
    };
    updates?: {
      title?: string;
      description?: string;
      tags?: string[];
      metafields?: Array<{ namespace: string; key: string; value: string; type: string }>;
      images?: Array<{ id: string; altText: string }>;
    };
  }

  export type { Product, GenerationResult, ContentStatus, ProductStatus };
