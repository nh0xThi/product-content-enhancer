import { useEffect } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { useLoaderData } from "react-router";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
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
    
    // Return redirect URL for manual redirect button if automatic redirect fails
    return { redirectUrl: redirectUrl.toString() };
  } catch (error) {
    // Re-throw redirect responses (from authenticate.admin during OAuth)
    // React Router will handle them properly
    if (error instanceof Response) {
      throw error;
    }
    // Re-throw any other errors
    throw error;
  }
};

export default function AuthCallback() {
  const { redirectUrl } = useLoaderData<typeof loader>();

  // Try automatic redirect after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = redirectUrl;
    }, 1000); // Wait 1 second before auto-redirect

    return () => clearTimeout(timer);
  }, [redirectUrl]);

  const handleManualRedirect = () => {
    window.location.href = redirectUrl;
  };

  return (
    <AppProvider embedded={false}>
      <s-page>
        <s-section heading="Authentication Successful">
          <s-paragraph>
            You have been successfully authenticated. Redirecting to the app...
          </s-paragraph>
          <s-stack direction="block" gap="base">
            <s-button onClick={handleManualRedirect} variant="primary">
              Continue to App
            </s-button>
            <s-paragraph>
              If you are not redirected automatically, click the button above.
            </s-paragraph>
          </s-stack>
        </s-section>
      </s-page>
    </AppProvider>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
