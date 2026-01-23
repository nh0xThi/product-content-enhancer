import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, type UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Detect environment
const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';

// === FIXED: Handle both Render and local development ===
if (isRender) {
  // On Render, always use production URL
  process.env.SHOPIFY_APP_URL = "https://product-content-enhancer.onrender.com";
  process.env.HOST = "https://product-content-enhancer.onrender.com";
} else {
  // Original Shopify CLI logic for local development
  if (
    process.env.HOST &&
    (!process.env.SHOPIFY_APP_URL ||
      process.env.SHOPIFY_APP_URL === process.env.HOST)
  ) {
    process.env.SHOPIFY_APP_URL = process.env.HOST;
    delete process.env.HOST;
  }
}

// Get the app URL - with fallback
const appUrl = process.env.SHOPIFY_APP_URL || 
  (isRender 
    ? "https://product-content-enhancer.onrender.com" 
    : "http://localhost");

const host = new URL(appUrl).hostname;

// HMR configuration
let hmrConfig;
if (host === "localhost" || isRender) {
  hmrConfig = isRender ? false : {
    protocol: "ws",
    host: "localhost",
    port: 64999,
    clientPort: 64999,
  };
} else {
  hmrConfig = {
    protocol: "wss",
    host: host,
    port: parseInt(process.env.FRONTEND_PORT || "8002"),
    clientPort: 443,
  };
}

export default defineConfig({
  server: {
    host: isRender ? '0.0.0.0' : host, // Bind to 0.0.0.0 on Render
    allowedHosts: [host],
    port: Number(process.env.PORT || 3000),
    hmr: hmrConfig,
    fs: {
      allow: ["app", "node_modules"],
    },
  },
  plugins: [
    reactRouter(),
    tsconfigPaths(),
  ],
  build: {
    assetsInlineLimit: 0,
  },
  optimizeDeps: {
    include: ["@prisma/client", "@shopify/app-bridge-react"],
  },
}) satisfies UserConfig;