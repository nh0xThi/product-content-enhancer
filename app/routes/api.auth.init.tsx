import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import crypto from "crypto";

const API_KEY = process.env.SHOPIFY_API_KEY!;
const SCOPES = process.env.SCOPES || "read_products,write_products,write_themes";

const buildRedirectUri = (request: Request) => {
  if (process.env.HOST) {
    return `${process.env.HOST.replace(/\/$/, "")}/api/auth/callback`;
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return null;

  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}/api/auth/callback`;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopParam = url.searchParams.get("shop");

  if (!shopParam) {
    return new Response(JSON.stringify({ error: "Missing shop parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const redirectUri = buildRedirectUri(request);
  if (!redirectUri) {
    return new Response(JSON.stringify({ error: "Unable to resolve redirect URI" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const shop = shopParam.replace(".myshopify.com", "");
  const state = crypto.randomBytes(16).toString("hex");

  // Log for debugging - remove in production
  console.log("OAuth initiation:", {
    shop,
    redirectUri,
    apiKey: API_KEY ? `${API_KEY.substring(0, 8)}...` : "MISSING",
  });

  const oauthUrl = `https://${shop}.myshopify.com/admin/oauth/authorize?client_id=${API_KEY}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  // Create redirect response with cookies
  const isProduction = process.env.NODE_ENV === "production";
  const secureFlag = isProduction ? "Secure; " : "";
  
  // Build cookie strings
  const stateCookie = `shopify_state=${state}; HttpOnly; ${secureFlag}SameSite=Lax; Path=/`;
  const shopCookie = `shopify_shop=${shop}; HttpOnly; ${secureFlag}SameSite=Lax; Path=/`;
  
  // Create response with redirect and cookies
  const response = redirect(oauthUrl);
  
  // Append cookies to response headers
  // React Router allows multiple Set-Cookie headers
  response.headers.append("Set-Cookie", stateCookie);
  response.headers.append("Set-Cookie", shopCookie);

  return response;
};
