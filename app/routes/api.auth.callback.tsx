// Handle /api/auth/callback route
// Manual OAuth callback handler (similar to Next.js implementation)
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

const API_KEY = process.env.SHOPIFY_API_KEY!;
const API_SECRET = process.env.SHOPIFY_API_SECRET!;

// Helper function to parse cookies from request headers
const parseCookies = (cookieHeader: string | null): Record<string, string> => {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    if (name && rest.length > 0) {
      cookies[name] = decodeURIComponent(rest.join("="));
    }
  });
  
  return cookies;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const shopParam = url.searchParams.get("shop");
  
  // Parse cookies from request
  const cookieHeader = request.headers.get("Cookie");
  const cookies = parseCookies(cookieHeader);
  const storedState = cookies["shopify_state"];
  const storedShop = cookies["shopify_shop"];
  
  // Extract shop name (remove .myshopify.com if present)
  let shop = shopParam?.replace(".myshopify.com", "") || storedShop;
  
  // Validate required parameters
  if (!code) {
    return new Response(JSON.stringify({ error: "Missing authorization code" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  if (!state) {
    return new Response(JSON.stringify({ error: "Missing state parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  if (!shop) {
    return new Response(JSON.stringify({ error: "Missing shop parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  if (state !== storedState) {
    console.error("State mismatch:", { received: state, stored: storedState });
    return new Response(
      JSON.stringify({ error: "Invalid state parameter - possible CSRF attack" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  
  // Ensure shop doesn't contain .myshopify.com for the API call
  shop = shop.replace(".myshopify.com", "");

  try {
    // Shopify expects form-encoded data, not JSON
    const formData = new URLSearchParams({
      client_id: API_KEY,
      client_secret: API_SECRET,
      code,
    });

    const response = await fetch(`https://${shop}.myshopify.com/admin/oauth/access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const { access_token } = data;

    if (!access_token) {
      throw new Error("No access token received from Shopify");
    }

    // Build redirect URL
    const baseUrl = new URL(request.url);
    const redirectPath = "/app"; // Change to "/dashboard" if you create that route
    const redirectUrl = new URL(redirectPath, baseUrl.origin);

    console.log("Setting cookies after OAuth:", {
      shop,
      hasToken: !!access_token,
      url: request.url,
    });

    // Create redirect response with cookies
    const isProduction = process.env.NODE_ENV === "production";
    const secureFlag = isProduction ? "Secure; " : "";
    const maxAge = 60 * 60 * 24 * 30; // 30 days
    
    const redirectResponse = redirect(redirectUrl.toString());
    
    // Set cookies
    redirectResponse.headers.append(
      "Set-Cookie",
      `shopify_access_token=${access_token}; HttpOnly; ${secureFlag}SameSite=Lax; Path=/; Max-Age=${maxAge}`
    );
    redirectResponse.headers.append(
      "Set-Cookie",
      `shopify_shop=${shop}; HttpOnly; ${secureFlag}SameSite=Lax; Path=/; Max-Age=${maxAge}`
    );

    return redirectResponse;
  } catch (error: any) {
    console.error("Token exchange error:", error);
    const errorMessage = error.message || "Unknown error";
    console.error("Error details:", error);
    
    return new Response(
      JSON.stringify({
        error: "Auth failed",
        details: errorMessage,
        shop,
        hasCode: !!code,
        hasState: !!state,
        stateMatches: state === storedState,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

