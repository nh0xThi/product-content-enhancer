import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/access';

const renderDndToHtml = (dndData: any): string => {
  if (!dndData || !dndData.content || !Array.isArray(dndData.content)) {
    return '';
  }

  const htmlParts: string[] = [];

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

// GET - Get a specific job
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const job = await prisma.job.findUnique({ where: { id } });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const membership = await prisma.userStore.findUnique({
      where: {
        userId_storeId: {
          userId: user.id,
          storeId: job.storeId,
        },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update a job
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, generatedHtml, dndData, originalProduct } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (dndData !== undefined) updateData.dndData = dndData;
    if (originalProduct !== undefined) updateData.originalProduct = originalProduct;
    if (generatedHtml !== undefined) {
      updateData.generatedHtml = generatedHtml;
    } else if (dndData !== undefined) {
      const parsedDnd = typeof dndData === 'string'
        ? (() => {
            try {
              return JSON.parse(dndData);
            } catch {
              return null;
            }
          })()
        : dndData;
      updateData.generatedHtml = renderDndToHtml(parsedDnd) || updateData.generatedHtml;
    }

    const htmlForStatus = updateData.generatedHtml || '';
    const plainText = htmlForStatus.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const contentStatus = plainText.length > 0 && plainText.length < 300 ? 'needed improve' : undefined;
    const derivedStatus = contentStatus || (status === 'completed' ? 'ai generated' : undefined);

    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const membership = await prisma.userStore.findUnique({
      where: {
        userId_storeId: {
          userId: user.id,
          storeId: existing.storeId,
        },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const job = await prisma.job.update({
      where: { id },
      data: updateData,
    });

    if (derivedStatus) {
      try {
        await prisma.$executeRaw`
          UPDATE "jobs"
          SET "productStatus" = ${derivedStatus}, "updatedAt" = NOW()
          WHERE "id" = ${job.id}
        `;
      } catch (updateErr) {
        console.warn('Failed to update job productStatus after save:', updateErr);
      }

      try {
        const clientAny = prisma as any;
        if (clientAny && clientAny.product && typeof clientAny.product.upsert === 'function') {
          await clientAny.product.upsert({
            where: {
              shopifyId_storeId: {
                shopifyId: job.productId,
                storeId: job.storeId,
              },
            },
            update: { status: derivedStatus },
            create: { shopifyId: job.productId, status: derivedStatus, storeId: job.storeId },
          });
        }
      } catch (uErr) {
        console.warn('Failed to update product status after save:', uErr);
      }
    }

    // When job is completed, ensure a Product record exists and set its status to 'ai generated'
    if (status === 'completed') {
      try {
        await prisma.product.upsert({
          where: {
            shopifyId_storeId: {
              shopifyId: job.productId,
              storeId: job.storeId,
            },
          },
          update: { status: 'ai generated' },
          create: { shopifyId: job.productId, status: 'ai generated', storeId: job.storeId },
        });
      } catch (uErr) {
        console.warn('Failed to upsert product status for completed job:', uErr);
      }
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error updating job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a job
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    const membership = await prisma.userStore.findUnique({
      where: {
        userId_storeId: {
          userId: user.id,
          storeId: existing.storeId,
        },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.job.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
