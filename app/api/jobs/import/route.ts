import { NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { requireStoreAccess } from '@/lib/access';

const stripCustomStyling = (html: string) => {
  if (!html) return html;
  let cleaned = html;
  // Remove <style> blocks
  cleaned = cleaned.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
  // Remove inline style attributes except for table-related tags
  const keepStyleTags = new Set(['table', 'thead', 'tbody', 'tr', 'th', 'td', 'colgroup', 'col', 'caption']);
  cleaned = cleaned.replace(
    /<([a-z0-9:-]+)([^>]*?)\sstyle=(["'])([\s\S]*?)\3([^>]*?)>/gi,
    (match, tag, before, _quote, _styleValue, after) => {
      const tagLower = String(tag).toLowerCase();
      if (keepStyleTags.has(tagLower)) {
        return match;
      }
      return `<${tag}${before}${after}>`;
    }
  );
  return cleaned;
};

const renderDndToHtml = (dndData: any): string => {
  if (!dndData || !dndData.content || !Array.isArray(dndData.content)) {
    return '';
  }

  const htmlParts: string[] = [];
  const seenFeatures = new Set<string>();
  const seenSpecs = new Set<string>();

  dndData.content.forEach((item: any) => {
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
        const normalized = content
          .map((feature: any) => `${feature?.name || ''}::${feature?.description || ''}`.trim())
          .join('|')
          .toLowerCase();
        if (!seenFeatures.has(normalized)) {
          htmlParts.push(`<div><h3>${heading}</h3><ul>${items}</ul></div>`);
          seenFeatures.add(normalized);
        }
        break;
      }
      case 'LongDescription': {
        const content = props.content || '';
        if (!content) return;
        const paragraphs = String(content)
          .split(/\n{2,}/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => p.replace(/\s+/g, ' ').trim())
          .filter((p) => {
            const normalized = p.toLowerCase();
            if (!normalized) return false;
            if (seenFeatures.has(normalized) || seenSpecs.has(normalized)) {
              return false;
            }
            return true;
          })
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
        const normalized = rows
          .map((spec: any) => `${spec?.name || ''}::${spec?.value || ''}::${spec?.unit || ''}`.trim())
          .join('|')
          .toLowerCase();
        if (!seenSpecs.has(normalized)) {
          htmlParts.push(
          `<h3>Technical Specifications</h3>` +
          `<table>` +
            `<thead><tr><th>Specification</th><th>Value</th></tr></thead>` +
            `<tbody>${body}</tbody>` +
          `</table>`
          );
          seenSpecs.add(normalized);
        }
        break;
      }
      case 'BrandLink': {
        const brandName = props.brandName || '';
        const url = props.url || '';
        const description = props.description || '';
        if (!brandName && !description) return;
        if (!url || /example\.com/i.test(url)) return;
        const normalizedName = brandName && brandName.toLowerCase() !== 'brand name'
          ? brandName
          : (() => {
              try {
                return url.replace(/^https?:\/\//i, '').split('/')[0] || brandName;
              } catch {
                return brandName;
              }
            })();
        htmlParts.push(
          `<div>` +
            (url && normalizedName ? `<a href="${url}">${normalizedName}</a>` : normalizedName ? `<p>${normalizedName}</p>` : '') +
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

async function updateProductDescription(
  shopDomain: string,
  accessToken: string,
  productId: string,
  descriptionHtml: string
): Promise<boolean> {
  try {
    const sanitizedDescription = stripCustomStyling(descriptionHtml);
    const mutation = `
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await axios.post(
      `https://${shopDomain}/admin/api/2024-10/graphql.json`,
      {
        query: mutation,
        variables: {
          input: {
            id: productId,
            descriptionHtml: sanitizedDescription,
          },
        },
      },
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if ((response.data as any).errors) {
      console.error('GraphQL errors:', (response.data as any).errors);
      return false;
    }

    const userErrors = response.data.data?.productUpdate?.userErrors;
    if (userErrors && userErrors.length > 0) {
      console.error('User errors:', userErrors);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to update product:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { storeId, jobIds } = await request.json();

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json({ error: 'jobIds must be a non-empty array' }, { status: 400 });
    }

    const access = await requireStoreAccess(request, storeId);
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    if (store.status !== 'active') {
      return NextResponse.json({ error: 'Store is not active' }, { status: 400 });
    }

    const shopDomainBase = store.shop.replace(/\.myshopify\.com$/i, '');
    const shopDomain = `${shopDomainBase}.myshopify.com`;
    const accessToken = store.accessToken;

    const jobs = await prisma.job.findMany({
      where: {
        id: {
          in: jobIds,
        },
        storeId,
      },
    });

    const jobsById = new Map(jobs.map((job) => [job.id, job]));
    let importedCount = 0;
    let totalItems = 0;
    const errors: Array<{ jobId: string; error: string }> = [];

    for (const jobId of jobIds) {
      const job = jobsById.get(jobId);
      if (!job) {
        errors.push({ jobId, error: 'Job not found' });
        continue;
      }

      const original = typeof job.originalProduct === 'string'
        ? (() => {
            try {
              return JSON.parse(job.originalProduct);
            } catch {
              return null;
            }
          })()
        : job.originalProduct;

      const batchItems = original?.batch && Array.isArray(original.products)
        ? original.products
        : null;

      if (batchItems) {
        let batchErrors = 0;
        for (const item of batchItems) {
          totalItems += 1;
          const dndData = typeof item.dndData === 'string'
            ? (() => {
                try {
                  return JSON.parse(item.dndData);
                } catch {
                  return null;
                }
              })()
            : item.dndData;

          const htmlFromDnd = renderDndToHtml(dndData);
          const descriptionHtml = htmlFromDnd || item.generatedHtml || '';

          if (!descriptionHtml) {
            errors.push({ jobId, error: `No generated content to import for product ${item.productId}` });
            batchErrors += 1;
            continue;
          }

          const updated = await updateProductDescription(
            shopDomain,
            accessToken,
            item.productId,
            descriptionHtml
          );

          if (!updated) {
            errors.push({ jobId, error: `Failed to update product ${item.productId}` });
            batchErrors += 1;
            continue;
          }

          importedCount += 1;

          try {
            const clientAny = prisma as any;
            if (clientAny && clientAny.product && typeof clientAny.product.upsert === 'function') {
              await clientAny.product.upsert({
                where: {
                  shopifyId_storeId: {
                    shopifyId: item.productId,
                    storeId,
                  },
                },
                update: { status: 'ai content imported' },
                create: { shopifyId: item.productId, status: 'ai content imported', storeId },
              });
            }
          } catch (uErr) {
            console.warn('Failed to update product status after import:', uErr);
          }
        }

        if (batchErrors === 0) {
          try {
            await prisma.$executeRaw`
              UPDATE "jobs"
              SET "productStatus" = 'ai content imported', "updatedAt" = NOW()
              WHERE "id" = ${job.id}
            `;
          } catch (updateErr) {
            console.warn('Failed to update batch job productStatus after import:', updateErr);
          }
        }

        continue;
      }

      totalItems += 1;

      const dndData = typeof job.dndData === 'string'
        ? (() => {
            try {
              return JSON.parse(job.dndData);
            } catch {
              return null;
            }
          })()
        : job.dndData;

      const htmlFromDnd = renderDndToHtml(dndData);
      const descriptionHtml = htmlFromDnd || job.generatedHtml || '';

      if (!descriptionHtml) {
        errors.push({ jobId, error: 'No generated content to import' });
        continue;
      }

      const updated = await updateProductDescription(
        shopDomain,
        accessToken,
        job.productId,
        descriptionHtml
      );

      if (!updated) {
        errors.push({ jobId, error: 'Failed to update product' });
        continue;
      }

      importedCount += 1;

      try {
        await prisma.$executeRaw`
          UPDATE "jobs"
          SET "productStatus" = 'ai content imported', "updatedAt" = NOW()
          WHERE "id" = ${job.id}
        `;
      } catch (updateErr) {
        console.warn('Failed to update job productStatus after import:', updateErr);
      }

      try {
        const clientAny = prisma as any;
        if (clientAny && clientAny.product && typeof clientAny.product.upsert === 'function') {
          await clientAny.product.upsert({
            where: {
              shopifyId_storeId: {
                shopifyId: job.productId,
                storeId,
              },
            },
            update: { status: 'ai content imported' },
            create: { shopifyId: job.productId, status: 'ai content imported', storeId },
          });
        }
      } catch (uErr) {
        console.warn('Failed to update product status after import:', uErr);
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      total: totalItems,
      errors,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import' },
      { status: 500 }
    );
  }
}
