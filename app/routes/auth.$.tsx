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
    }, 5000);

    return () => clearTimeout(timer);
  }, [redirectUrl]);

  const handleManualRedirect = () => {
    window.location.href = redirectUrl;
  };

  return (
    <AppProvider embedded={false}>
      <div
        style={{
          padding: "3rem 2rem",
          maxWidth: "600px",
          margin: "0 auto",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <div
          style={{
            padding: "2rem",
            border: "1px solid #e1e3e5",
            borderRadius: "8px",
            backgroundColor: "#fff",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
        >
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "600",
              marginBottom: "1rem",
              color: "#202223",
            }}
          >
            Authentication Successful
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "#5e6e77",
              marginBottom: "2rem",
              lineHeight: "1.5",
            }}
          >
            You have been successfully authenticated. Redirecting to the app...
          </p>
          <button
            onClick={handleManualRedirect}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              backgroundColor: "#008060",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              display: "block",
              width: "100%",
              transition: "background-color 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#006e52";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#008060";
            }}
          >
            Continue to App
          </button>
          <p
            style={{
              marginTop: "1rem",
              color: "#6d7175",
              fontSize: "14px",
              textAlign: "center",
            }}
          >
            If you are not redirected automatically, click the button above.
          </p>
        </div>
      </div>
    </AppProvider>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
