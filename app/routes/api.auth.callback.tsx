// Handle /api/auth/callback route
// This is the same as auth.$.tsx but for the /api/auth/callback path
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Authenticate the request - this handles the OAuth flow
    // During OAuth, authenticate.admin will throw redirect responses
    // After OAuth completes, it returns the admin object
    await authenticate.admin(request);
    
    // If we reach here, authentication is complete
    // Get external app URL from environment variable
    // Defaults to SHOPIFY_APP_URL if EXTERNAL_APP_URL is not set
    const externalAppUrl = process.env.EXTERNAL_APP_URL || process.env.SHOPIFY_APP_URL;
    
    // Get shop parameter from URL if available
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const host = url.searchParams.get("host");
    
    // Build redirect URL
    let redirectUrl: string;
    if (externalAppUrl) {
      // If external URL is provided, use it
      const targetUrl = new URL(externalAppUrl);
      if (shop) targetUrl.searchParams.set("shop", shop);
      if (host) targetUrl.searchParams.set("host", host);
      redirectUrl = targetUrl.toString();
    } else {
      // Default to /app with shop parameter
      const origin = new URL(request.url).origin;
      const path = shop ? `/app?shop=${shop}${host ? `&host=${host}` : ''}` : "/app";
      redirectUrl = `${origin}${path}`;
    }
    
    // Check if redirect is to external domain (different origin)
    const currentOrigin = new URL(request.url).origin;
    const targetOrigin = new URL(redirectUrl).origin;
    const isExternalRedirect = currentOrigin !== targetOrigin;
    
    // For external redirects in embedded apps, return HTML with JavaScript redirect
    // This works better in iframes than HTTP redirects
    if (isExternalRedirect) {
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
  <script>window.top.location.href = ${JSON.stringify(redirectUrl)};</script>
</head>
<body>
  <p>Redirecting to external app...</p>
  <p>If you are not redirected, <a href="${redirectUrl}">click here</a>.</p>
</body>
</html>`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html",
          },
        }
      );
    }
    
    // For same-origin redirects, use standard redirect
    throw redirect(redirectUrl);
  } catch (error) {
    // Re-throw redirect responses (from authenticate.admin during OAuth or our redirect)
    // React Router will handle them properly
    if (error instanceof Response) {
      throw error;
    }
    // Re-throw any other errors
    throw error;
  }
};

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
