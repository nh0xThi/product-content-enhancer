# OAuth Callback URLs Configuration

## Overview

Your app is configured to handle OAuth callbacks at three different URLs:

1. `/auth/callback` - Primary callback URL
2. `/auth/shopify/callback` - Alternative callback URL
3. `/api/auth/callback` - API-style callback URL

## Route Handlers

### 1. `/auth/callback` and `/auth/shopify/callback`

**Route File**: `app/routes/auth.$.tsx`

The `auth.$.tsx` route uses a catch-all pattern (`$`) that handles all routes under `/auth/*`, including:
- `/auth/callback`
- `/auth/shopify/callback`
- Any other `/auth/*` paths

### 2. `/api/auth/callback`

**Route File**: `app/routes/api.auth.callback.tsx`

This is a specific route handler for the `/api/auth/callback` path.

## How They Work

Both route handlers:
1. Authenticate the OAuth request using `authenticate.admin()`
2. Handle the OAuth flow (token exchange, session creation)
3. After successful authentication, redirect to:
   - `EXTERNAL_APP_URL` (if set)
   - `SHOPIFY_APP_URL` (if EXTERNAL_APP_URL not set)
   - `/app` (fallback)

## Configuration

### In `shopify.app.toml`

All three URLs are configured:

```toml
[auth]
redirect_urls = [
  "https://product-content-enhancer.onrender.com/auth/callback",
  "https://product-content-enhancer.onrender.com/auth/shopify/callback",
  "https://product-content-enhancer.onrender.com/api/auth/callback"
]
```

### In Shopify Partner Dashboard

Make sure all three URLs are also added in your Shopify Partner Dashboard:
1. Go to your app in [Shopify Partners](https://partners.shopify.com)
2. Navigate to **"App setup"**
3. Under **"Allowed redirection URL(s)"**, add all three URLs

## Why Multiple URLs?

Different Shopify integrations or OAuth flows might use different callback URL patterns:
- `/auth/callback` - Standard callback
- `/auth/shopify/callback` - Shopify-specific callback
- `/api/auth/callback` - API-style callback (common in some integrations)

Having all three ensures compatibility with different OAuth flows.

## Testing

To test each callback URL:

1. **Test `/auth/callback`**:
   ```
   https://product-content-enhancer.onrender.com/auth/callback?shop=example.myshopify.com&code=...
   ```

2. **Test `/auth/shopify/callback`**:
   ```
   https://product-content-enhancer.onrender.com/auth/shopify/callback?shop=example.myshopify.com&code=...
   ```

3. **Test `/api/auth/callback`**:
   ```
   https://product-content-enhancer.onrender.com/api/auth/callback?shop=example.myshopify.com&code=...
   ```

All three should:
- Authenticate successfully
- Create a session
- Redirect to your external app URL (or `/app` if not set)

## Important Notes

1. **All routes use the same logic** - They all authenticate and redirect the same way
2. **Shopify will use one of these URLs** - Depending on the OAuth flow, Shopify will redirect to one of these URLs
3. **Keep all three configured** - This ensures maximum compatibility

## Troubleshooting

### Callback URL Not Working

- Verify the URL is added in Shopify Partner Dashboard
- Check that the route file exists and is properly configured
- Verify `authPathPrefix` in `shopify.server.ts` is set to `/auth`
- Check server logs for authentication errors

### Redirect Not Happening

- Verify `EXTERNAL_APP_URL` or `SHOPIFY_APP_URL` is set
- Check browser console for JavaScript errors
- Verify the redirect URL is accessible
