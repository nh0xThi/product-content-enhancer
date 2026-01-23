# External App Redirect After OAuth

## Overview

After successful OAuth authentication, the app will redirect to an external app URL instead of the default `/app` route.

## Configuration

### Step 1: Set Environment Variable (Optional)

`EXTERNAL_APP_URL` is optional. If not set, it will default to `SHOPIFY_APP_URL`.

**For Local Development (.env):**
```env
# Optional - defaults to SHOPIFY_APP_URL if not set
EXTERNAL_APP_URL=https://your-external-app.com
```

**For Production (Render.io):**
1. Go to Render Dashboard → Your Web Service → Environment
2. Add environment variable (optional):
   - **Key**: `EXTERNAL_APP_URL`
   - **Value**: `https://your-external-app.com`
   - **Note**: If not set, will use `SHOPIFY_APP_URL`

### Step 2: How It Works

1. User initiates OAuth flow
2. Shopify redirects to `/auth/callback`
3. App authenticates the user
4. After successful authentication, app redirects to `EXTERNAL_APP_URL`
5. Shop and host parameters are preserved in the redirect URL

## Redirect URL Format

The redirect URL will include query parameters:

```
https://your-external-app.com?shop=example.myshopify.com&host=base64-encoded-host
```

- `shop`: The shop domain (e.g., `example.myshopify.com`)
- `host`: The host parameter from Shopify (for embedded apps)

## Examples

### Example 1: Redirect to External Dashboard

```env
EXTERNAL_APP_URL=https://dashboard.example.com
```

After OAuth: `https://dashboard.example.com?shop=example.myshopify.com&host=...`

### Example 2: Redirect to Different Domain

```env
EXTERNAL_APP_URL=https://app.yourcompany.com/shopify
```

After OAuth: `https://app.yourcompany.com/shopify?shop=example.myshopify.com&host=...`

### Example 3: Use SHOPIFY_APP_URL (Default Behavior)

If `EXTERNAL_APP_URL` is not set, the app will use `SHOPIFY_APP_URL` and redirect to that URL with shop parameters.

### Example 4: No App URL Set

If neither `EXTERNAL_APP_URL` nor `SHOPIFY_APP_URL` is set, the app will redirect to `/app` (fallback).

## Code Location

The redirect logic is in:
- **File**: `app/routes/auth.$.tsx`
- **Function**: `loader` function

## Testing

1. Set `EXTERNAL_APP_URL` in your `.env` file
2. Start your app: `npm run dev`
3. Initiate OAuth flow
4. After authentication, you should be redirected to your external app URL

## Important Notes

1. **Shop Parameter**: The shop domain is automatically included in the redirect URL
2. **Host Parameter**: The host parameter (for embedded apps) is also preserved
3. **Default**: If `EXTERNAL_APP_URL` is not set, uses `SHOPIFY_APP_URL` (same as your app URL)
4. **Fallback**: If neither is set, redirects to `/app` (fallback)
5. **OAuth Flow**: The redirect only happens after successful authentication
6. **Security**: Make sure your external app validates the shop parameter

## Troubleshooting

### Redirect Not Working

- Check that `EXTERNAL_APP_URL` is set correctly
- Verify the URL is accessible
- Check browser console for errors
- Verify OAuth completed successfully

### Missing Shop Parameter

- The shop parameter comes from the OAuth callback URL
- If missing, check that Shopify is sending it in the callback

### Redirect Loop

- Ensure your external app doesn't redirect back to the auth callback
- Check that authentication is completing successfully

## Security Considerations

1. **Validate Shop Parameter**: Your external app should validate the `shop` parameter
2. **Verify Session**: Consider verifying the session is valid before processing
3. **HTTPS**: Always use HTTPS for production redirects
4. **Domain Whitelist**: Consider whitelisting allowed redirect domains
