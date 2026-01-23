# Render.io 502 Bad Gateway Troubleshooting Guide

## Problem
Getting a 502 Bad Gateway error when accessing the app from Shopify admin panel, even though the app works when accessed directly.

## Common Causes

### 1. Request Timeout
Render.io has a default timeout of 30 seconds. Shopify admin requests, especially during authentication, can take longer.

### 2. Cold Start Issues
When the service spins up after being idle, the first request might timeout while:
- Prisma client is being initialized
- Database connection is being established
- The app is loading

### 3. Database Connection Issues
If your database (SQLite file or PostgreSQL) is slow to respond on first connection.

## Solutions Applied

### 1. Health Check Endpoint
Added `/health` route that responds quickly, allowing Render to verify the service is running.

### 2. Optimized Database Connection
Updated `app/db.server.ts` to:
- Better connection pooling
- Graceful shutdown handling
- Optimized logging for production

### 3. Render Configuration
Created `render.yaml` with:
- Health check path configured
- Proper environment variables
- Build and start commands

## Steps to Fix in Render Dashboard

### 1. Check Service Settings

1. Go to your Render dashboard
2. Select your web service
3. Go to **Settings** tab
4. Verify:
   - **Health Check Path**: Should be `/health`
   - **Auto-Deploy**: Should be enabled if using Git
   - **Environment**: Should be `Node`

### 2. Increase Timeout (if available)

1. In Render dashboard → Your service → Settings
2. Look for **Timeout** or **Request Timeout** setting
3. Increase to at least **300 seconds** (5 minutes) for initial requests
4. Note: Free tier might have limitations

### 3. Check Environment Variables

Ensure these are set in Render dashboard → Environment:

```env
NODE_ENV=production
PORT=3000
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_APP_URL=https://product-content-enhancer.onrender.com
SCOPES=read_products,write_products,read_product_listings,write_product_listings,read_themes,write_themes
DATABASE_URL=your_database_url
PERPLEXITY_API_KEY=your_perplexity_key
```

### 4. Check Logs

1. Go to **Logs** tab in Render dashboard
2. Look for errors when accessing from admin:
   - Database connection errors
   - Prisma client errors
   - Timeout errors
   - Authentication errors

### 5. Upgrade Plan (if needed)

The free tier on Render has limitations:
- **Starter plan**: Better performance, longer timeouts
- Consider upgrading if timeouts persist

## Additional Debugging Steps

### Test Health Endpoint

```bash
curl https://product-content-enhancer.onrender.com/health
```

Should return: `OK`

### Test Direct Access

```bash
curl https://product-content-enhancer.onrender.com/
```

Should return your app's HTML.

### Check Database Connection

If using SQLite, ensure the file is accessible. If using PostgreSQL:
- Verify connection string is correct
- Check if database allows connections from Render's IPs
- Ensure database is not sleeping (some free tiers sleep after inactivity)

### Monitor Service Status

1. In Render dashboard, check **Metrics** tab
2. Look for:
   - High response times
   - Memory usage
   - CPU usage
   - Request count

## Quick Fixes to Try

### 1. Restart the Service
Sometimes a simple restart fixes timeout issues:
- Render dashboard → Your service → Manual Deploy → Clear build cache & deploy

### 2. Check Build Logs
Ensure the build completes successfully:
- Look for Prisma generation errors
- Check for missing dependencies
- Verify build output exists

### 3. Verify Start Command
In Render dashboard → Settings → Start Command should be:
```
npm run start
```

### 4. Add Keep-Alive (if using free tier)
Free tier services sleep after inactivity. Consider:
- Using a paid plan
- Setting up a cron job to ping `/health` endpoint
- Using an external service to ping your app every few minutes

## Expected Behavior After Fixes

1. Health check should respond quickly (< 1 second)
2. Direct access should work
3. Admin panel access should work (may take 10-30 seconds on first request after sleep)
4. Subsequent requests should be faster

## If Issues Persist

1. **Check Render Status**: https://status.render.com
2. **Review Render Logs**: Look for specific error messages
3. **Test Locally**: Ensure app works with `npm run start`
4. **Database Issues**: If using SQLite, consider switching to PostgreSQL
5. **Contact Support**: Render support or Shopify community forums

## Monitoring

Set up monitoring to catch issues early:
- Use Render's built-in metrics
- Set up external monitoring (UptimeRobot, Pingdom)
- Monitor error rates in logs
