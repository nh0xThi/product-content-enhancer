import { useEffect } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { useLoaderData } from "react-router";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("🔵 [AUTH CALLBACK] Loader started");
  console.log("🔵 [AUTH CALLBACK] Request URL:", request.url);
  console.log("🔵 [AUTH CALLBACK] Request method:", request.method);
  console.log("🔵 [AUTH CALLBACK] Request headers:", Object.fromEntries(request.headers.entries()));
  
  try {
    // Authenticate the request - this handles the OAuth flow
    // During OAuth, authenticate.admin will throw redirect responses
    // After OAuth completes, it returns the admin object
    console.log("🔵 [AUTH CALLBACK] Starting authentication...");
    const admin = await authenticate.admin(request);
    console.log("🔵 [AUTH CALLBACK] Authentication successful!");
    console.log("🔵 [AUTH CALLBACK] Admin object received:", admin ? "✓" : "✗");
    
    // If we reach here, authentication is complete
    // After OAuth callback, redirect back to the app at /app route
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const host = url.searchParams.get("host");
    
    console.log("🔵 [AUTH CALLBACK] URL parsing:");
    console.log("  - Full URL:", url.toString());
    console.log("  - Origin:", url.origin);
    console.log("  - Pathname:", url.pathname);
    console.log("  - Search params:", url.search);
    console.log("  - Shop parameter:", shop);
    console.log("  - Host parameter:", host);
    
    // Get the app URL - prioritize EXTERNAL_APP_URL for production, then SHOPIFY_APP_URL, then current origin
    const EXTERNAL_APP_URL = process.env.EXTERNAL_APP_URL;
    const SHOPIFY_APP_URL = process.env.SHOPIFY_APP_URL;
    
    console.log("🔵 [AUTH CALLBACK] Environment variables:");
    console.log("  - EXTERNAL_APP_URL:", EXTERNAL_APP_URL || "(not set)");
    console.log("  - SHOPIFY_APP_URL:", SHOPIFY_APP_URL || "(not set)");
    console.log("  - Current origin:", url.origin);
    
    const appUrl = EXTERNAL_APP_URL || SHOPIFY_APP_URL || url.origin;
    console.log("🔵 [AUTH CALLBACK] Selected app URL:", appUrl);
    
    const appUrlObj = new URL(appUrl);
    console.log("🔵 [AUTH CALLBACK] App URL object:", {
      origin: appUrlObj.origin,
      hostname: appUrlObj.hostname,
      protocol: appUrlObj.protocol,
    });
    
    // Redirect to /app route with shop parameter
    // This is the main app page after authentication
    const redirectPath = "/app";
    const redirectUrl = new URL(redirectPath, appUrlObj.origin);
    
    console.log("🔵 [AUTH CALLBACK] Building redirect URL:");
    console.log("  - Base URL:", appUrlObj.origin);
    console.log("  - Redirect path:", redirectPath);
    console.log("  - Initial redirect URL:", redirectUrl.toString());
    
    // Preserve shop and host parameters
    if (shop) {
      redirectUrl.searchParams.set("shop", shop);
      console.log("🔵 [AUTH CALLBACK] Added shop parameter:", shop);
    }
    if (host) {
      redirectUrl.searchParams.set("host", host);
      console.log("🔵 [AUTH CALLBACK] Added host parameter:", host);
    }
    
    const finalRedirectUrl = redirectUrl.toString();
    console.log("🔵 [AUTH CALLBACK] Final redirect URL:", finalRedirectUrl);
    console.log("🔵 [AUTH CALLBACK] Returning redirect URL to component");
    
    // Return redirect URL for manual redirect button if automatic redirect fails
    return { redirectUrl: finalRedirectUrl };
  } catch (error) {
    console.error("🔴 [AUTH CALLBACK] Error in loader:");
    console.error("  - Error type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("  - Error message:", error instanceof Error ? error.message : String(error));
    console.error("  - Is Response:", error instanceof Response);
    
    if (error instanceof Response) {
      console.log("🔵 [AUTH CALLBACK] Response error (likely OAuth redirect):");
      console.log("  - Status:", error.status);
      console.log("  - Status text:", error.statusText);
      console.log("  - Headers:", Object.fromEntries(error.headers.entries()));
      if (error.headers.get("location")) {
        console.log("  - Location header:", error.headers.get("location"));
      }
    }
    
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
  console.log("🟢 [AUTH CALLBACK] Component rendering");
  
  const loaderData = useLoaderData<typeof loader>();
  console.log("🟢 [AUTH CALLBACK] Loader data received:", loaderData);
  
  const { redirectUrl } = loaderData;
  console.log("🟢 [AUTH CALLBACK] Redirect URL from loader:", redirectUrl);
  console.log("🟢 [AUTH CALLBACK] Current window location:", {
    href: window.location.href,
    origin: window.location.origin,
    pathname: window.location.pathname,
    search: window.location.search,
  });

  // Try automatic redirect after a short delay
  useEffect(() => {
    console.log("🟢 [AUTH CALLBACK] useEffect triggered");
    console.log("🟢 [AUTH CALLBACK] Setting up auto-redirect timer (5 seconds)");
    console.log("🟢 [AUTH CALLBACK] Will redirect to:", redirectUrl);
    
    const timer = setTimeout(() => {
      console.log("🟢 [AUTH CALLBACK] Auto-redirect timer fired!");
      console.log("🟢 [AUTH CALLBACK] Redirecting to:", redirectUrl);
      console.log("🟢 [AUTH CALLBACK] Current location before redirect:", window.location.href);
      
      try {
        window.location.href = redirectUrl;
        console.log("🟢 [AUTH CALLBACK] window.location.href set successfully");
      } catch (error) {
        console.error("🔴 [AUTH CALLBACK] Error during auto-redirect:", error);
      }
    }, 5000);

    return () => {
      console.log("🟢 [AUTH CALLBACK] Cleanup: clearing auto-redirect timer");
      clearTimeout(timer);
    };
  }, [redirectUrl]);

  const handleManualRedirect = () => {
    console.log("🟢 [AUTH CALLBACK] Manual redirect button clicked!");
    console.log("🟢 [AUTH CALLBACK] Redirecting to:", redirectUrl);
    console.log("🟢 [AUTH CALLBACK] Current location before redirect:", window.location.href);
    
    try {
      window.location.href = redirectUrl;
      console.log("🟢 [AUTH CALLBACK] window.location.href set successfully");
    } catch (error) {
      console.error("🔴 [AUTH CALLBACK] Error during manual redirect:", error);
    }
  };
  
  console.log("🟢 [AUTH CALLBACK] Rendering UI with redirect button");

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
          {/* Debug information */}
          <div
            style={{
              marginTop: "2rem",
              padding: "1rem",
              backgroundColor: "#f6f6f7",
              borderRadius: "4px",
              fontSize: "12px",
              fontFamily: "monospace",
              wordBreak: "break-all",
            }}
          >
            <strong>Debug Info:</strong>
            <br />
            Redirect URL: {redirectUrl}
            <br />
            Current URL: {typeof window !== "undefined" ? window.location.href : "N/A"}
            <br />
            Check browser console for detailed logs
          </div>
        </div>
      </div>
    </AppProvider>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
