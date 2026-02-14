import { NextResponse } from 'next/server';
import perplexity from '@/lib/perplexity';
import { prisma } from '@/lib/prisma';
import { requireStoreAccess } from '@/lib/access';

export async function POST(request: Request) {
  try {
    const { storeId, product, products, structure, customPrompt } = await request.json();

    const targetProducts = Array.isArray(products)
      ? products
      : product
        ? [product]
        : [];

    if (!storeId || targetProducts.length === 0 || !structure) {
      return NextResponse.json(
        { error: 'storeId, product(s), and structure are required' },
        { status: 400 }
      );
    }

    const access = await requireStoreAccess(request, storeId);
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const skipStatuses = new Set(['content pass', 'ai generated', 'ai content imported', 'imported']);

    const generateForProduct = async (item: any) => {
      const prompt = buildPromptFromStructure(item, structure, customPrompt);

      const response = await perplexity.chat.completions.create({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are an expert e-commerce copywriter specializing in SEO and conversion rate optimization. Generate publish-ready product descriptions with proper HTML tags based on the provided structure.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      let generatedContent = response.choices[0]?.message?.content || '';
      if (generatedContent) {
        generatedContent = generatedContent.replace(/https?:\/\/example\.com[^\s"'<)]*/gi, '');
        generatedContent = generatedContent.replace(/example\.com/gi, '');
        generatedContent = generatedContent.replace(/Brand\s*Name\s*\([^)]*example\.com[^)]*\)/gi, '');
        generatedContent = generatedContent.replace(/BrandName\s*\([^)]*example\.com[^)]*\)/gi, '');
        generatedContent = generatedContent.replace(/Brand\s*Name\s*[-–—]\s*example\.com/gi, '');
        generatedContent = generatedContent.replace(/BrandName\s*[-–—]\s*example\.com/gi, '');
        generatedContent = generatedContent.replace(/Brand\s*Name\s*example\.com/gi, '');
        generatedContent = generatedContent.replace(/BrandName\s*example\.com/gi, '');
      }

      const plainText = generatedContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      const contentStatus = plainText.length < 300 ? 'needed improve' : 'ai generated';
      const dndContent = parseHtmlToDnd(generatedContent, structure, item);

      return { generatedContent, dndContent, contentStatus };
    };

    if (targetProducts.length > 1) {
      const batchItems = [];
      const results = [];

      for (const item of targetProducts) {
        const prodStatus = (item?.status || '').toString().toLowerCase();
        if (prodStatus && skipStatuses.has(prodStatus)) {
          results.push({
            productId: item?.id || item?.productId || 'unknown',
            success: false,
            error: `Generation skipped: product status is '${prodStatus}'`,
          });
          continue;
        }

        try {
          const { generatedContent, dndContent, contentStatus } = await generateForProduct(item);

          batchItems.push({
            productId: item.id || item.productId || String(Date.now()),
            productTitle: item.title || 'Untitled Product',
            productVendor: item.vendor || null,
            productType: item.product_type || null,
            productStatus: contentStatus,
            generatedHtml: generatedContent,
            dndData: dndContent,
            originalProduct: item,
          });

          try {
            const clientAny = prisma as any;
            if (clientAny && clientAny.product && typeof clientAny.product.upsert === 'function') {
              await clientAny.product.upsert({
                where: {
                  shopifyId_storeId: {
                    shopifyId: item.id,
                    storeId,
                  },
                },
                update: { status: contentStatus },
                create: { shopifyId: item.id, status: contentStatus, storeId },
              });
            }
          } catch (uErr) {
            console.warn('Failed to update product status after generation:', uErr);
          }

          results.push({
            productId: item.id || item.productId || 'unknown',
            success: true,
          });
        } catch (err: any) {
          results.push({
            productId: item?.id || item?.productId || 'unknown',
            success: false,
            error: err?.message || 'Generation failed',
          });
        }
      }

      if (batchItems.length === 0) {
        return NextResponse.json(
          { error: 'All selected products were skipped', results },
          { status: 409 }
        );
      }

      const batchId = `batch-${Date.now()}`;
      const jobData = {
        storeId,
        productId: batchId,
        productTitle: `Batch (${batchItems.length} products)`,
        productVendor: null,
        productType: null,
        status: 'completed',
        productStatus: 'ai generated',
        generatedHtml: null,
        dndData: null,
        originalProduct: {
          batch: true,
          products: batchItems,
          results,
        },
      };

      let job;
      try {
        job = await prisma.job.create({ data: jobData });
      } catch (createError: any) {
        const message = createError?.message || '';
        if (message.includes('Unknown argument `productStatus`')) {
          const { productStatus, ...fallbackData } = jobData as any;
          job = await prisma.job.create({ data: fallbackData });
        } else {
          throw createError;
        }
      }

      const successCount = results.filter((r: any) => r.success).length;
      const failureCount = results.length - successCount;

      return NextResponse.json({
        jobId: job.id,
        results,
        successCount,
        failureCount,
        total: results.length,
      });
    }

    const singleProduct = targetProducts[0];
    const prodStatus = (singleProduct?.status || '').toString().toLowerCase();
    if (prodStatus && skipStatuses.has(prodStatus)) {
      return NextResponse.json(
        { error: `Generation skipped: product status is '${prodStatus}'` },
        { status: 409 }
      );
    }

    const { generatedContent, dndContent, contentStatus } = await generateForProduct(singleProduct);

      const jobData = {
        storeId,
        productId: singleProduct.id || singleProduct.productId || String(Date.now()),
        productTitle: singleProduct.title || 'Untitled Product',
        productVendor: singleProduct.vendor || null,
      productType: singleProduct.product_type || null,
      status: 'completed',
      productStatus: contentStatus,
      generatedHtml: generatedContent,
      dndData: dndContent,
      originalProduct: singleProduct,
    };

    let job;
    try {
      job = await prisma.job.create({ data: jobData });
    } catch (createError: any) {
      const message = createError?.message || '';
      if (message.includes('Unknown argument `productStatus`')) {
        const { productStatus, ...fallbackData } = jobData as any;
        job = await prisma.job.create({ data: fallbackData });
      } else {
        throw createError;
      }
    }

    try {
      const clientAny = prisma as any;
      if (clientAny && clientAny.product && typeof clientAny.product.upsert === 'function') {
        await clientAny.product.upsert({
          where: {
            shopifyId_storeId: {
              shopifyId: singleProduct.id,
              storeId,
            },
          },
          update: { status: contentStatus },
          create: { shopifyId: singleProduct.id, status: contentStatus, storeId },
        });
      }
    } catch (uErr) {
      console.warn('Failed to update product status after generation:', uErr);
    }

    return NextResponse.json({
      content: generatedContent,
      dndData: dndContent,
      jobId: job.id,
    });
  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function buildPromptFromStructure(product: any, structure: string, customPrompt?: string) {
  const structureObj = JSON.parse(structure);
  
  // Convert PUCK structure to HTML template
  const htmlTemplate = convertDndToHtml(structureObj);
  const components = Array.isArray(structureObj?.content) ? structureObj.content : [];
  const shortDesc = components.find((c: any) => c?.type === 'ShortDescription')?.props || {};
  const longDesc = components.find((c: any) => c?.type === 'LongDescription')?.props || {};
  const hasFeatures = components.some((c: any) => c?.type === 'Features');
  const hasSpecs = components.some((c: any) => c?.type === 'TechnicalSpecifications');
  const shortCharLimit = typeof shortDesc.characterLimit === 'number' ? shortDesc.characterLimit : undefined;
  const shortBanned = shortDesc.bannedTerms ? String(shortDesc.bannedTerms) : '';
  const longSeo = longDesc.seoKeywords ? String(longDesc.seoKeywords) : '';
  const longReading = longDesc.readingLevel ? String(longDesc.readingLevel) : '';
  const longBanned = longDesc.bannedPhrases ? String(longDesc.bannedPhrases) : '';
  const longUseHeadings = Boolean(longDesc.useSectionHeadings);
  const longExpandable = Boolean(longDesc.expandableSections);
  const longAiInstruction = longDesc.aiInstruction ? String(longDesc.aiInstruction) : '';
  const shortAiInstruction = shortDesc.aiInstruction ? String(shortDesc.aiInstruction) : '';

  const componentInstructions: string[] = [];
  componentInstructions.push('Do NOT repeat content between Short Description, Features, Technical Specifications, and Long Description.');
  if (hasFeatures) {
    componentInstructions.push('Features/Key Benefits must be distinct bullet points and MUST NOT be repeated in Long Description.');
  }
  if (hasSpecs) {
    componentInstructions.push('Technical Specifications must be in a table and MUST NOT be repeated in Long Description.');
  }
  if (shortCharLimit) {
    componentInstructions.push(`Short Description: keep within ${shortCharLimit} characters (1–2 sentences).`);
  } else {
    componentInstructions.push('Short Description: 1–2 concise sentences for quick scanning.');
  }
  if (shortBanned) {
    componentInstructions.push(`Short Description banned terms: ${shortBanned}.`);
  }
  if (shortAiInstruction) {
    componentInstructions.push(`Short Description custom instruction: ${shortAiInstruction}`);
  }
  componentInstructions.push('Long Description: detailed narrative (use cases, benefits, materials, differentiation) without repeating other sections.');
  if (longUseHeadings) {
    componentInstructions.push('Long Description: include section headings using \"## Heading\" format.');
  }
  if (longExpandable) {
    componentInstructions.push('Long Description: write in clearly separated sections (good for collapsible display).');
  }
  if (longSeo) {
    componentInstructions.push(`Long Description SEO keywords (use naturally): ${longSeo}.`);
  }
  if (longReading) {
    componentInstructions.push(`Long Description reading level: ${longReading}.`);
  }
  if (longBanned) {
    componentInstructions.push(`Long Description banned phrases: ${longBanned}.`);
  }
  if (longAiInstruction) {
    componentInstructions.push(`Long Description custom instruction: ${longAiInstruction}`);
  }
  const customBlock = customPrompt ? `\nAdditional Instructions:\n${customPrompt}\n` : '';
  
  return `You are an expert e-commerce copywriter and SEO specialist. Using the HTML structure below as the exact output template, generate ready-to-publish product content (HTML only) tailored to the product data provided.

Product Data:
Title: ${product.title}
Vendor: ${product.vendor || 'Unknown'}
Type: ${product.product_type || 'Unknown'}
Current Description: ${product.description || 'None'}

HTML Template (output must follow this structure exactly and replace placeholders with real content):
${htmlTemplate}

Instructions:
- Follow these component rules:
${componentInstructions.map((line) => `- ${line}`).join('\n')}
- Output HTML only (no surrounding markdown, no code fences, no explanatory text).
- Replace placeholder text with product-specific content. Do not leave example.com or other placeholder domains; omit BrandLink if vendor is unknown.
- Produce a concise Short Description (1–2 sentences) optimized for web.
  + Keep tone consistent with any 'tone' instructions provided in the structure (neutral, bold, technical, friendly, premium).
- Render Features as a list of benefit-focused items (each with a short title and one-sentence detail).
- Include a Technical Specifications table when applicable; keep units and values precise.
- If a relevant YouTube video exists and is clearly related to this product, include an iframe embed near the related content; otherwise omit video embeds.
- Use the product title and vendor to seed SEO keywords naturally; prefer exact title in at least one heading.
- Keep tone consistent with any tone instructions provided in the structure (neutral, bold, technical, friendly, premium).
- Avoid filler, repetition, and marketing cliches; keep sentences short and scannable.
- Ensure all HTML is semantic and accessible (use headings in order, include meaningful link text).
${customBlock}

Generate the complete HTML description now:`;
}

function convertDndToHtml(dndData: any): string {
  if (!dndData || !dndData.content || !Array.isArray(dndData.content)) {
    return '<p>No structure defined</p>';
  }

  const htmlParts: string[] = [];

  dndData.content.forEach((item: any) => {
    if (!item.type || !item.props) return;

    const componentType = item.type;
    const props = item.props;

    switch (componentType) {
      case 'HeroText':
        htmlParts.push(`<div style="text-align: center; padding: 32px 0;">
  <h2 style="font-weight: 600; font-size: 2rem; line-height: 1.3;">${props.headline || '[HEADLINE]'}</h2>
  ${props.subHeadline ? `<p style="margin-top: 16px; font-size: 1.25rem; color: #6b7280;">${props.subHeadline}</p>` : ''}
</div>`);
        break;

      case 'ShortDescription':
        htmlParts.push(`<div style="padding: 16px 0;">
  <p style="font-size: 1rem; line-height: 1.6; color: #374151;">${props.content || '[SHORT DESCRIPTION]'}</p>
</div>`);
        break;

      case 'Features':
        if (props.content && Array.isArray(props.content)) {
          htmlParts.push(`<div style="padding: 24px 0;">
  <h3 style="margin-bottom: 20px; font-size: 1.5rem; font-weight: 600;">${props.emphasizeBenefits ? 'Key Benefits' : 'Features'}</h3>
  <ul style="list-style: none; padding: 0;">
${(props.content || []).map((feature: any) => `    <li style="margin-bottom: 16px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h4 style="margin-bottom: 8px; font-weight: 600; font-size: 1.125rem;">${feature.name || '[FEATURE NAME]'}</h4>
      <p style="color: #6b7280; font-size: 0.9375rem; line-height: 1.5; margin: 0;">${feature.description || '[FEATURE DESCRIPTION]'}</p>
    </li>`).join('\n')}
  </ul>
</div>`);
        }
        break;

      case 'LongDescription':
        htmlParts.push(`<div style="padding: 24px 0;">
  ${props.useSectionHeadings ? 
    `<h3 style="font-size: 1.5rem; font-weight: 600; margin-top: 24px; margin-bottom: 12px;">[SECTION HEADING]</h3>
  <p style="line-height: 1.8; color: #374151; margin-bottom: 16px;">[SECTION CONTENT]</p>` :
    `<p style="line-height: 1.8; color: #374151;">${props.content || '[LONG DESCRIPTION CONTENT]'}</p>`
  }
</div>`);
        break;

      case 'TechnicalSpecifications':
        if (props.specifications && Array.isArray(props.specifications)) {
          htmlParts.push(`<div style="padding: 24px 0;">
  <h3 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 16px;">Technical Specifications</h3>
  <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px;">
    <thead>
      <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb;">
        <th style="text-align: left; padding: 14px 16px; font-weight: 600;">Specification</th>
        <th style="text-align: left; padding: 14px 16px; font-weight: 600;">Value</th>
      </tr>
    </thead>
    <tbody>
${props.specifications.map((spec: any) => `      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 14px 16px; font-weight: 500;">${spec.name || '[SPEC NAME]'}</td>
        <td style="padding: 14px 16px;">${spec.value || '[VALUE]'}${spec.unit ? ` ${spec.unit}` : ''}</td>
      </tr>`).join('\n')}
    </tbody>
  </table>
</div>`);
        }
        break;

      case 'BrandLink':
        htmlParts.push(`<div style="padding: 20px; margin: 16px 0; border: 1px solid #e5e7eb; border-radius: 8px;">
  <div style="margin-bottom: 8px;">
    <a href="${props.url || '#'}" style="font-size: 1.25rem; font-weight: 600; color: #2563eb; text-decoration: none;">${props.brandName || '[BRAND NAME]'} →</a>
  </div>
  ${props.description ? `<p style="font-size: 0.9375rem; color: #6b7280; margin-top: 8px;">${props.description}</p>` : ''}
</div>`);
        break;

      case 'YouTubeEmbed':
        htmlParts.push(`<div style="padding: 24px 0;">
  <div style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; background-color: #000;">
    <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" 
            src="https://www.youtube.com/embed/[VIDEO_ID]" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen></iframe>
  </div>
  ${props.caption ? `<p style="margin-top: 12px; font-size: 0.9375rem; color: #6b7280; text-align: center;">${props.caption}</p>` : ''}
</div>`);
        break;

      default:
        htmlParts.push(`<!-- Unknown component: ${componentType} -->`);
    }
  });

  return htmlParts.join('\n\n');
}

function parseHtmlToDnd(html: string, originalStructure: string, product?: any) {
  // This is a simplified parser - in production, you'd want a more robust solution
  // The idea is to parse the HTML and map it back to Dnd components
  
  try {
    const structure = JSON.parse(originalStructure);
    // Map generated HTML back into component props (best-effort)
    const stripTags = (s = '') => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

    const getMatches = (str: string, re: RegExp) => {
      const out: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(str)) !== null) {
        out.push(m[1] || '');
      }
      return out;
    };

    const parsed = { ...structure };
    if (parsed.content && Array.isArray(parsed.content)) {
      parsed.content = parsed.content.map((item: any) => {
        const copy = { ...item };
        const blockHtml = (() => {
          // Try to extract a block corresponding to this component by type markers
          switch (item.type) {
            case 'HeroText':
              // extract first <h1> or <h2>
              const h = html.match(/<h[1-2][^>]*>([\s\S]*?)<\/(?:h1|h2)>/i);
              return h ? h[0] : '';
            case 'ShortDescription':
              // find first <p>
              const p = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
              return p ? p[0] : '';
            case 'Features':
              // match list items
              const ul = html.match(/<ul[\s\S]*?<\/ul>/i);
              return ul ? ul[0] : '';
            case 'LongDescription':
              // return a large block
              return html;
            case 'TechnicalSpecifications':
              const tbody = html.match(/<tbody[\s\S]*?<\/tbody>/i);
              return tbody ? tbody[0] : '';
            case 'BrandLink':
              const a = html.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
              const pdesc = html.match(/<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
              return pdesc ? pdesc[0] : (a ? a[0] : '');
            case 'YouTubeEmbed':
              const iframe = html.match(/<iframe[^>]*src=["']([^"']+)["'][^>]*><\/iframe>/i);
              const cap = html.match(/<iframe[\s\S]*?<\/iframe>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
              return iframe ? iframe[0] + (cap ? cap[0] : '') : '';
            default:
              return '';
          }
        })();

        try {
          switch (item.type) {
            case 'HeroText': {
              const m = blockHtml.match(/<h[1-2][^>]*>([\s\S]*?)<\/(?:h1|h2)>/i);
              copy.props = { ...copy.props, content: m ? stripTags(m[1]) : copy.props.content };
              break;
            }
            case 'ShortDescription': {
              const m = blockHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
              copy.props = { ...copy.props, content: m ? stripTags(m[1]) : copy.props.content };
              break;
            }
            case 'Features': {
              const items = blockHtml.match(/<li[\s\S]*?<\/li>/gi) || [];
              const features = items.map((li) => {
                const name = (li.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i) || [])[1] || (li.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i) || [])[1] || '';
                const desc = (li.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || '';
                return { name: stripTags(name), description: stripTags(desc) };
              });
              copy.props = { ...copy.props, content: features.length ? features : copy.props.content };
              break;
            }
            case 'LongDescription': {
              // Extract headings and paragraphs in order and join as plain text (no Markdown)
              const parts: string[] = [];
              const re = /<(h[1-6]|p)[^>]*>([\s\S]*?)<\/\1>/gi;
              let mm: RegExpExecArray | null;
              while ((mm = re.exec(html)) !== null) {
                parts.push(stripTags(mm[2]));
              }
              const out = parts.length ? parts.join('\n\n') : stripTags(html);
              copy.props = { ...copy.props, content: out || copy.props.content };
              break;
            }
            case 'TechnicalSpecifications': {
              const rows = (blockHtml.match(/<tr[\s\S]*?<\/tr>/gi) || []).map((tr) => {
                const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
                const first = tds[0] ? stripTags(tds[0].replace(/<td[^>]*>/i, '').replace(/<\/td>$/i, '')) : '';
                const second = tds[1] ? stripTags(tds[1].replace(/<td[^>]*>/i, '').replace(/<\/td>$/i, '')) : '';
                return { name: first, value: second };
              });
              copy.props = { ...copy.props, content: rows.length ? rows : copy.props.content };
              break;
            }
            case 'BrandLink': {
              const ah = blockHtml.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
              const desc = blockHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
              if (ah) {
                const url = ah[1];
                const name = stripTags(ah[2]);
                const isPlaceholderUrl = !url || url === '#' || /example\.com/i.test(url) || /example/i.test(url);
                const isPlaceholderName = !name || /\[?brand name\]?/i.test(name) || /example/i.test(name);
                // Only include brandName if product.vendor exists and Perplexity returned a non-placeholder URL/name
                if (product && product.vendor && !isPlaceholderUrl && !isPlaceholderName) {
                  copy.props = { ...copy.props, brandName: name, url };
                }
              }
              if (desc) {
                const d = stripTags(desc[1]);
                if (d && !/example\.com/i.test(d) && !/example/i.test(d)) {
                  copy.props = { ...copy.props, description: d };
                }
              }
              break;
            }
            case 'YouTubeEmbed': {
              const iframe = blockHtml.match(/<iframe[^>]*src=["']([^"']+)["'][^>]*><\/iframe>/i);
              const caption = blockHtml.match(/<iframe[\s\S]*?<\/iframe>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
              if (iframe) {
                const src = iframe[1];
                // Try several patterns to find a video id
                const vid = (src.match(/embed\/([^?"'&]+)/i) || src.match(/[?&]v=([^&"'&]+)/i) || src.match(/youtu\.be\/([^?"'&]+)/i) || [])[1];
                if (vid) {
                  // Determine surrounding text near the iframe to see if it's related to the product
                  const idx = html.indexOf(iframe[0]);
                  const before = html.slice(Math.max(0, idx - 300), idx);
                  const after = html.slice(idx + iframe[0].length, Math.min(html.length, idx + iframe[0].length + 300));
                  const surroundingText = stripTags(before + ' ' + after).toLowerCase();

                  const productTitle = (product && (product.title || product.productTitle || ''))?.toString().toLowerCase() || '';
                  const productVendor = (product && (product.vendor || product.product_vendor || ''))?.toString().toLowerCase() || '';

                  const titleWords = productTitle.split(/\s+/).filter((w: string) => w.length > 3);
                  const titleMatches = titleWords.filter((w: string) => surroundingText.includes(w)).length;

                  const looksRelated = (
                    (productTitle && (surroundingText.includes(productTitle) || titleMatches >= Math.min(2, Math.max(1, titleWords.length)))) ||
                    (productVendor && surroundingText.includes(productVendor))
                  );

                  if (looksRelated) {
                    // Use embed URL or original src so the Dnd renderer can show an iframe preview
                    const embedUrl = src.includes('youtube.com/embed') ? src : `https://www.youtube.com/embed/${vid}`;
                    copy.props = { ...copy.props, content: embedUrl, embedStyle: 'inline' };
                  }
                }
              }
              if (caption) copy.props = { ...copy.props, caption: stripTags(caption[1]) };
              break;
            }
            default:
              break;
          }
        } catch (e) {
          // noop, keep original props
        }

        return copy;
      });
    }

    return parsed;
  } catch (error) {
    return { content: [], root: { props: {} } };
  }
}


