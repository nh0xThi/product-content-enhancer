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
    // After OAuth callback, redirect back to the app at /app route
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const host = url.searchParams.get("host");
    
    // Get the app URL - prioritize EXTERNAL_APP_URL for production, then SHOPIFY_APP_URL, then current origin
    const appUrl = process.env.EXTERNAL_APP_URL || process.env.SHOPIFY_APP_URL || url.origin;
    const appUrlObj = new URL(appUrl);
    
    // Redirect to /app route with shop parameter
    // This is the main app page after authentication
    const redirectPath = "/app";
    const redirectUrl = new URL(redirectPath, appUrlObj.origin);
    
    // Preserve shop and host parameters
    if (shop) redirectUrl.searchParams.set("shop", shop);
    if (host) redirectUrl.searchParams.set("host", host);
    
    // For standalone apps, use standard HTTP redirect
    // React Router requires throwing redirects, not returning them
    throw redirect(redirectUrl.toString());
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
