import { useEffect } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { useLoaderData } from "react-router";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Use both console.log and process.stdout for maximum visibility
  const log = (message: string, ...args: any[]) => {
    console.log(message, ...args);
    if (typeof process !== "undefined" && process.stdout) {
      process.stdout.write(`[AUTH CALLBACK] ${message}\n`);
    }
  };
  
  log("🔵 [AUTH CALLBACK] Loader started");
  log("🔵 [AUTH CALLBACK] Request URL:", request.url);
  log("🔵 [AUTH CALLBACK] Request method:", request.method);
  log("🔵 [AUTH CALLBACK] Request headers:", Object.fromEntries(request.headers.entries()));
  
  try {
    // Authenticate the request - this handles the OAuth flow
    // During OAuth, authenticate.admin will throw redirect responses
    // After OAuth completes, it returns the admin object
    log("🔵 [AUTH CALLBACK] Starting authentication...");
    const admin = await authenticate.admin(request);
    log("🔵 [AUTH CALLBACK] Authentication successful!");
    log("🔵 [AUTH CALLBACK] Admin object received:", admin ? "✓" : "✗");
    
    // If we reach here, authentication is complete
    // After OAuth callback, redirect back to the app at /app route
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const host = url.searchParams.get("host");
    
    log("🔵 [AUTH CALLBACK] URL parsing:");
    log("  - Full URL:", url.toString());
    log("  - Origin:", url.origin);
    log("  - Pathname:", url.pathname);
    log("  - Search params:", url.search);
    log("  - Shop parameter:", shop);
    log("  - Host parameter:", host);
    
    // Get the app URL - prioritize EXTERNAL_APP_URL for production, then SHOPIFY_APP_URL, then current origin
    const EXTERNAL_APP_URL = process.env.EXTERNAL_APP_URL;
    const SHOPIFY_APP_URL = process.env.SHOPIFY_APP_URL;
    
    log("🔵 [AUTH CALLBACK] Environment variables:");
    log("  - EXTERNAL_APP_URL:", EXTERNAL_APP_URL || "(not set)");
    log("  - SHOPIFY_APP_URL:", SHOPIFY_APP_URL || "(not set)");
    log("  - Current origin:", url.origin);
    
    const appUrl = EXTERNAL_APP_URL || SHOPIFY_APP_URL || url.origin;
    log("🔵 [AUTH CALLBACK] Selected app URL:", appUrl);
    
    const appUrlObj = new URL(appUrl);
    log("🔵 [AUTH CALLBACK] App URL object:", {
      origin: appUrlObj.origin,
      hostname: appUrlObj.hostname,
      protocol: appUrlObj.protocol,
    });
    
    // Redirect to /app route with shop parameter
    // This is the main app page after authentication
    const redirectPath = "/app";
    const redirectUrl = new URL(redirectPath, appUrlObj.origin);
    
    log("🔵 [AUTH CALLBACK] Building redirect URL:");
    log("  - Base URL:", appUrlObj.origin);
    log("  - Redirect path:", redirectPath);
    log("  - Initial redirect URL:", redirectUrl.toString());
    
    // Preserve shop and host parameters
    if (shop) {
      redirectUrl.searchParams.set("shop", shop);
      log("🔵 [AUTH CALLBACK] Added shop parameter:", shop);
    }
    if (host) {
      redirectUrl.searchParams.set("host", host);
      log("🔵 [AUTH CALLBACK] Added host parameter:", host);
    }
    
    const finalRedirectUrl = redirectUrl.toString();
    log("🔵 [AUTH CALLBACK] Final redirect URL:", finalRedirectUrl);
    log("🔵 [AUTH CALLBACK] Returning redirect URL to component");
    
    // Return redirect URL for manual redirect button if automatic redirect fails
    return { redirectUrl: finalRedirectUrl };
  } catch (error) {
    // Use both console.error and process.stderr for maximum visibility
    const logError = (message: string, ...args: any[]) => {
      console.error(message, ...args);
      if (typeof process !== "undefined" && process.stderr) {
        process.stderr.write(`[AUTH CALLBACK ERROR] ${message}\n`);
      }
    };
    
    logError("🔴 [AUTH CALLBACK] Error in loader:");
    logError("  - Error type:", error instanceof Error ? error.constructor.name : typeof error);
    logError("  - Error message:", error instanceof Error ? error.message : String(error));
    logError("  - Is Response:", error instanceof Response);
    
    if (error instanceof Response) {
      log("🔵 [AUTH CALLBACK] Response error (likely OAuth redirect):");
      log("  - Status:", error.status);
      log("  - Status text:", error.statusText);
      log("  - Headers:", Object.fromEntries(error.headers.entries()));
      if (error.headers.get("location")) {
        log("  - Location header:", error.headers.get("location"));
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
  // Log immediately when component starts
  if (typeof window !== "undefined") {
    console.log("🟢 [AUTH CALLBACK] Component rendering");
    console.log("🟢 [AUTH CALLBACK] Window location:", window.location.href);
  }
  
  let loaderData;
  let redirectUrl: string;
  
  try {
    loaderData = useLoaderData<typeof loader>();
    if (typeof window !== "undefined") {
      console.log("🟢 [AUTH CALLBACK] Loader data received:", loaderData);
    }
    
    redirectUrl = loaderData.redirectUrl;
    if (typeof window !== "undefined") {
      console.log("🟢 [AUTH CALLBACK] Redirect URL from loader:", redirectUrl);
      console.log("🟢 [AUTH CALLBACK] Current window location:", {
        href: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname,
        search: window.location.search,
      });
    }
  } catch (error) {
    console.error("🔴 [AUTH CALLBACK] Error in component:", error);
    redirectUrl = "/app"; // Fallback
  }

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
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <div
          style={{
            padding: "2rem",
            border: "2px solid #008060",
            borderRadius: "8px",
            backgroundColor: "#fff",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            width: "100%",
          }}
        >
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "700",
              marginBottom: "1rem",
              color: "#202223",
            }}
          >
            ✅ Authentication Successful
          </h1>
          <p
            style={{
              fontSize: "18px",
              color: "#5e6e77",
              marginBottom: "2rem",
              lineHeight: "1.6",
            }}
          >
            You have been successfully authenticated. Redirecting to the app in 5 seconds...
          </p>
          <button
            onClick={handleManualRedirect}
            style={{
              padding: "16px 32px",
              fontSize: "18px",
              backgroundColor: "#008060",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              display: "block",
              width: "100%",
              transition: "background-color 0.2s",
              marginBottom: "1rem",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#006e52";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#008060";
            }}
          >
            Continue to App Now
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
          {/* Debug information - always visible */}
          <div
            style={{
              marginTop: "2rem",
              padding: "1rem",
              backgroundColor: "#f6f6f7",
              borderRadius: "4px",
              fontSize: "12px",
              fontFamily: "monospace",
              wordBreak: "break-all",
              border: "1px solid #e1e3e5",
            }}
          >
            <strong style={{ display: "block", marginBottom: "0.5rem" }}>🔍 Debug Info:</strong>
            <div>Redirect URL: <strong style={{ color: "#008060" }}>{redirectUrl || "NOT SET"}</strong></div>
            <div>Current URL: {typeof window !== "undefined" ? window.location.href : "N/A"}</div>
            <div style={{ marginTop: "0.5rem", fontSize: "11px", color: "#6d7175" }}>
              Open browser console (F12) to see detailed logs
            </div>
          </div>
        </div>
      </div>
      {/* Inline script for immediate logging and redirect */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              console.log("🟢 [AUTH CALLBACK] Inline script executed");
              console.log("🟢 [AUTH CALLBACK] Redirect URL:", ${JSON.stringify(redirectUrl)});
              console.log("🟢 [AUTH CALLBACK] Current location:", window.location.href);
              setTimeout(function() {
                console.log("🟢 [AUTH CALLBACK] Auto-redirecting to:", ${JSON.stringify(redirectUrl)});
                if (${JSON.stringify(redirectUrl)}) {
                  window.location.href = ${JSON.stringify(redirectUrl)};
                }
              }, 5000);
            })();
          `,
        }}
      />
    </AppProvider>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
