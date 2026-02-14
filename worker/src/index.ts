type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  run: () => Promise<unknown>;
  first: <T>(columnName?: string) => Promise<T | null>;
};

type D1Database = {
  prepare: (query: string) => D1Statement;
};

type Queue = {
  send: (message: unknown) => Promise<void>;
};

type MessageBatch<T> = {
  messages: Array<{
    body: T;
    ack: () => void;
  }>;
};

type Env = {
  DB: D1Database;
  QUEUE: Queue;
  APP_BASE_URL: string;
  WORKER_SECRET: string;
  SHOPIFY_API_VERSION: string;
};

type Selection =
  | { mode: 'all'; limit?: number }
  | { mode: 'ids'; ids: string[]; limit?: number };

type BulkJob = {
  id: string;
  store_id: string;
  shop_domain: string;
  access_token: string;
  status: string;
  selection_json: string;
  structure_json: string;
  custom_prompt: string | null;
  cursor: string | null;
  offset: number | null;
  processed_count: number;
  failed_count: number;
  last_error: string | null;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const nowIso = () => new Date().toISOString();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const auth = request.headers.get('x-worker-secret') || '';
    if (auth !== env.WORKER_SECRET) {
      return json({ error: 'Unauthorized' }, 401);
    }

    if (request.method === 'POST' && url.pathname === '/jobs/create') {
      const body = await request.json();
      const { storeId, shopDomain, accessToken, structure, customPrompt, selection } = body || {};

      if (!storeId || !shopDomain || !accessToken || !structure || !selection) {
        return json({ error: 'Missing required fields' }, 400);
      }

      const jobId = crypto.randomUUID();
      const createdAt = nowIso();

      await env.DB.prepare(
        `INSERT INTO bulk_jobs
          (id, store_id, shop_domain, access_token, status, selection_json, structure_json, custom_prompt, cursor, offset, processed_count, failed_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, NULL, 0, 0, 0, ?, ?)`
      )
        .bind(
          jobId,
          storeId,
          shopDomain,
          accessToken,
          JSON.stringify(selection),
          JSON.stringify(structure),
          customPrompt || null,
          createdAt,
          createdAt
        )
        .run();

      await env.QUEUE.send({ jobId });
      return json({ jobId });
    }

    if (request.method === 'GET' && url.pathname.startsWith('/jobs/')) {
      const jobId = url.pathname.split('/').pop();
      if (!jobId) return json({ error: 'Job id required' }, 400);

      const job = await env.DB.prepare('SELECT * FROM bulk_jobs WHERE id = ?')
        .bind(jobId)
        .first<BulkJob>();

      if (!job) return json({ error: 'Job not found' }, 404);
      return json({ job });
    }

    return json({ error: 'Not found' }, 404);
  },

  async queue(batch: MessageBatch<{ jobId: string }>, env: Env) {
    for (const message of batch.messages) {
      try {
        const jobId = message.body.jobId;
        const job = await env.DB.prepare('SELECT * FROM bulk_jobs WHERE id = ?')
          .bind(jobId)
          .first<BulkJob>();

        if (!job) {
          message.ack();
          continue;
        }

        if (job.status === 'completed' || job.status === 'failed') {
          message.ack();
          continue;
        }

        await env.DB.prepare(
          'UPDATE bulk_jobs SET status = ?, updated_at = ? WHERE id = ?'
        )
          .bind('running', nowIso(), jobId)
          .run();

        const selection = JSON.parse(job.selection_json) as Selection;
        const structure = JSON.parse(job.structure_json);
        const limit = Math.min(Math.max(Number(selection.limit) || 25, 1), 250);

        let products: any[] = [];
        let nextCursor: string | null = job.cursor;
        let nextOffset = job.offset || 0;
        let hasNext = false;

        if (selection.mode === 'all') {
          const query = `
            query getProducts($first: Int!, $after: String) {
              products(first: $first, after: $after) {
                edges {
                  node {
                    id
                    title
                    description
                    handle
                    vendor
                    productType
                    tags
                    images(first: 10) {
                      edges {
                        node {
                          id
                          url
                          altText
                        }
                      }
                    }
                    variants(first: 1) {
                      edges {
                        node {
                          id
                          price
                          title
                        }
                      }
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          `;
          const response = await fetch(
            `https://${job.shop_domain}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`,
            {
              method: 'POST',
              headers: {
                'X-Shopify-Access-Token': job.access_token,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                query,
                variables: { first: limit, after: nextCursor || null },
              }),
            }
          );
          const data = await response.json();
          products = data.data?.products?.edges?.map((edge: any) => edge.node) || [];
          hasNext = Boolean(data.data?.products?.pageInfo?.hasNextPage);
          nextCursor = data.data?.products?.pageInfo?.endCursor || null;
        } else {
          const ids = selection.ids || [];
          const idsSlice = ids.slice(nextOffset, nextOffset + limit);
          const query = `
            query getProductsByIds($ids: [ID!]!) {
              nodes(ids: $ids) {
                ... on Product {
                  id
                  title
                  description
                  handle
                  vendor
                  productType
                  tags
                  images(first: 10) {
                    edges {
                      node {
                        id
                        url
                        altText
                      }
                    }
                  }
                  variants(first: 1) {
                    edges {
                      node {
                        id
                        price
                        title
                      }
                    }
                  }
                }
              }
            }
          `;
          const response = await fetch(
            `https://${job.shop_domain}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`,
            {
              method: 'POST',
              headers: {
                'X-Shopify-Access-Token': job.access_token,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ query, variables: { ids: idsSlice } }),
            }
          );
          const data = await response.json();
          products = (data.data?.nodes || []).filter(Boolean);
          nextOffset += idsSlice.length;
          hasNext = nextOffset < ids.length;
        }

        if (products.length === 0) {
          await env.DB.prepare(
            'UPDATE bulk_jobs SET status = ?, updated_at = ? WHERE id = ?'
          )
            .bind('completed', nowIso(), jobId)
            .run();
          message.ack();
          continue;
        }

        const generationResponse = await fetch(`${env.APP_BASE_URL}/api/perplexity/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            products,
            structure: JSON.stringify(structure),
            customPrompt: job.custom_prompt || undefined,
          }),
        });

        const generationData = await generationResponse.json();
        if (!generationResponse.ok) {
          throw new Error(generationData?.error || 'Generation failed');
        }

        const results = Array.isArray(generationData.results) ? generationData.results : [];
        const failureCount = results.filter((r: any) => r && r.success === false).length;
        const successCount = products.length - failureCount;

        await env.DB.prepare(
          `UPDATE bulk_jobs
           SET processed_count = processed_count + ?,
               failed_count = failed_count + ?,
               cursor = ?,
               offset = ?,
               status = ?,
               updated_at = ?
           WHERE id = ?`
        )
          .bind(
            successCount,
            failureCount,
            nextCursor,
            nextOffset,
            hasNext ? 'running' : 'completed',
            nowIso(),
            jobId
          )
          .run();

        if (hasNext) {
          await env.QUEUE.send({ jobId });
        }

        message.ack();
      } catch (error: any) {
        const jobId = message.body?.jobId;
        if (jobId) {
          await env.DB.prepare(
            'UPDATE bulk_jobs SET status = ?, last_error = ?, updated_at = ? WHERE id = ?'
          )
            .bind('failed', error?.message || 'Unknown error', nowIso(), jobId)
            .run();
        }
        message.ack();
      }
    }
  },
};
