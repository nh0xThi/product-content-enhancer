# Local Development Setup

## Setting Up .env File

### Step 1: Copy Environment Variables

1. Copy `.env.example` to `.env` (if not already done):
   ```bash
   cp .env.example .env
   ```

2. Or create `.env` manually in the root directory

### Step 2: Configure DATABASE_URL

Since your schema uses PostgreSQL, you have these options:

#### Option 1: Use Neon Database (Recommended)

Use the same Neon database for both local and production:

1. Go to **https://console.neon.tech**
2. Select your project
3. Go to **"Connection Details"** or **"Connection string"**
4. Copy the connection string
5. Paste it in `.env`:
   ```env
   DATABASE_URL=postgresql://user:password@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require
   ```

**Pros**: Same database for dev and prod, easy setup
**Cons**: Changes affect production data (be careful!)

#### Option 2: Use Local PostgreSQL

If you have PostgreSQL installed locally:

1. Create a local database:
   ```bash
   createdb product_content_enhancer
   ```

2. Set in `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/product_content_enhancer
   ```

**Pros**: Isolated from production
**Cons**: Requires PostgreSQL installation

#### Option 3: Use SQLite for Local Dev

If you prefer SQLite for local development:

1. **Change schema.prisma** temporarily:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

2. Set in `.env`:
   ```env
   DATABASE_URL=file:./prisma/dev.sqlite
   ```

3. **Remember**: Change back to PostgreSQL before deploying!

**Pros**: No database server needed
**Cons**: Different from production, requires schema changes

### Step 3: Configure Other Variables

Update `.env` with your actual values:

```env
# Get from Shopify Partner Dashboard
SHOPIFY_API_KEY=your_actual_api_key
SHOPIFY_API_SECRET=your_actual_secret

# Your local URL (Shopify CLI will handle this)
SHOPIFY_APP_URL=http://localhost:3000

# Get from PerplexityAI
PERPLEXITY_API_KEY=your_actual_perplexity_key
```

### Step 4: Run Migrations

After setting `DATABASE_URL`, run migrations:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

### Step 5: Start Development Server

```bash
npm run dev
```

Or with Shopify CLI:

```bash
shopify app dev
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `SHOPIFY_API_KEY` | Your Shopify app API key | From Partner Dashboard |
| `SHOPIFY_API_SECRET` | Your Shopify app secret | From Partner Dashboard |
| `SHOPIFY_APP_URL` | App URL (local: localhost, prod: your domain) | `http://localhost:3000` |
| `SCOPES` | Required Shopify permissions | `read_products,write_products,...` |
| `PERPLEXITY_API_KEY` | PerplexityAI API key | From PerplexityAI dashboard |
| `NODE_ENV` | Environment mode | `development` or `production` |

## Troubleshooting

### Error: "DATABASE_URL is required"
- **Fix**: Make sure `.env` file exists and has `DATABASE_URL` set

### Error: "Connection refused"
- **Fix**: Check if PostgreSQL is running (if using local)
- **Fix**: Verify Neon connection string is correct

### Error: "SSL required"
- **Fix**: Add `?sslmode=require` to Neon connection string

### Error: "Table does not exist"
- **Fix**: Run `npx prisma migrate dev` to create tables

## Important Notes

1. **Never commit `.env`** - It's in `.gitignore` for security
2. **Use `.env.example`** - Commit this as a template
3. **Different databases** - Consider using separate Neon projects for dev/prod
4. **Schema changes** - If you change schema, run `npx prisma migrate dev`

## Quick Start

1. ✅ Create `.env` file
2. ✅ Set `DATABASE_URL` (use Neon connection string)
3. ✅ Set Shopify credentials
4. ✅ Run `npx prisma migrate dev`
5. ✅ Run `npm run dev`
