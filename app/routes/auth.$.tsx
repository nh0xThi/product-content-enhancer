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
    
    // For standalone apps, use standard HTTP redirect
    // React Router requires throwing redirects, not returning them
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
