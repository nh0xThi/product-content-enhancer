# Setting Up Database on Render.io

## Problem
Your app is failing to start because `DATABASE_URL` environment variable is missing.

## Solution: Set Up PostgreSQL on Render

### Option 1: Use Render PostgreSQL (Recommended)

1. **Create PostgreSQL Database**:
   - Go to your Render dashboard
   - Click **"New +"** → **"PostgreSQL"**
   - Name it: `product-content-enhancer-db`
   - Select a plan (Free tier available for testing)
   - Click **"Create Database"**

2. **Get Connection String**:
   - After creation, go to your PostgreSQL service
   - Find **"Internal Database URL"** or **"Connection Pooling"**
   - Copy the connection string (looks like):
     ```
     postgresql://user:password@hostname:5432/database_name
     ```

3. **Add to Web Service Environment Variables**:
   - Go to your web service on Render
   - Click **"Environment"** tab
   - Click **"Add Environment Variable"**
   - Key: `DATABASE_URL`
   - Value: Paste the PostgreSQL connection string
   - Click **"Save Changes"**

4. **Redeploy**:
   - Go to **"Manual Deploy"** → **"Deploy latest commit"**
   - Or push a new commit to trigger auto-deploy

### Option 2: Use External PostgreSQL

You can use any PostgreSQL provider:
- **Supabase** (Free tier): https://supabase.com
- **Neon** (Free tier): https://neon.tech
- **Railway** (Free tier): https://railway.app
- **DigitalOcean**: https://www.digitalocean.com/products/managed-databases

Get the connection string from your provider and add it as `DATABASE_URL` in Render.

## Migration Steps

After setting up the database:

1. **First Deploy** (will run migrations automatically):
   - Your `docker-start` script runs `prisma migrate deploy`
   - This will create all tables in your PostgreSQL database

2. **Verify Tables**:
   - Connect to your database
   - You should see tables: `Session`, `Job`, `Product`, `Template` (if you have those models)

## Environment Variables Checklist

Make sure these are set in Render:

```env
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=production
PORT=3000
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_APP_URL=https://product-content-enhancer.onrender.com
SCOPES=read_products,write_products,read_product_listings,write_product_listings,read_themes,write_themes
```

## Important Notes

### SQLite vs PostgreSQL

- **SQLite** (`file:./dev.sqlite`): Works for local development only
- **PostgreSQL**: Required for production on Render because:
  - SQLite files are ephemeral in containers
  - Multiple instances can't share SQLite files
  - PostgreSQL is more reliable for production

### Local Development

For local development, you can still use SQLite:
1. Create a `.env` file:
   ```env
   DATABASE_URL="file:./prisma/dev.sqlite"
   ```
2. The schema will automatically use SQLite when it detects `file:` prefix

### Connection String Format

PostgreSQL connection string format:
```
postgresql://[user]:[password]@[host]:[port]/[database]?[parameters]
```

Example:
```
postgresql://myuser:mypassword@dpg-xxxxx-a.oregon-postgres.render.com:5432/mydb
```

For SSL (required on most cloud providers):
```
postgresql://user:password@host:5432/database?sslmode=require
```

## Troubleshooting

### Error: "Invalid value undefined for datasource"
- **Cause**: `DATABASE_URL` is not set
- **Fix**: Add `DATABASE_URL` environment variable in Render

### Error: "Connection refused" or "Can't reach database server"
- **Cause**: Database URL is incorrect or database is not accessible
- **Fix**: 
  - Verify connection string is correct
  - Check if database allows connections from Render's IPs
  - For Render PostgreSQL, use "Internal Database URL" if both services are in same region

### Error: "Table does not exist"
- **Cause**: Migrations haven't run
- **Fix**: Ensure `prisma migrate deploy` runs (it's in your `setup` script)

### Migration Errors
- If migrations fail, check:
  - Database user has CREATE TABLE permissions
  - Database exists and is accessible
  - Connection string is correct

## Quick Setup Script

After adding `DATABASE_URL` to Render, the deployment will:
1. Run `prisma generate` (generates Prisma client)
2. Run `prisma migrate deploy` (creates tables)
3. Start the server

If you need to run migrations manually:
```bash
# In Render shell or locally with DATABASE_URL set
npx prisma migrate deploy
```

## Next Steps

1. ✅ Set up PostgreSQL database on Render
2. ✅ Add `DATABASE_URL` to environment variables
3. ✅ Redeploy your service
4. ✅ Verify app starts successfully
5. ✅ Test accessing from Shopify admin
