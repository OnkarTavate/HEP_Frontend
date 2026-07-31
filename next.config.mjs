/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

// In development, the frontend (port 3000) calls backend services on different
// ports (5001, 5005, 5006) and needs ws:// for Next.js HMR.  In production
// everything should go through the same origin via a reverse proxy.
const connectSrc = isDev
  ? [
      "'self'",
      "http://localhost:5001",
      "http://localhost:5005",
      "http://localhost:5006",
      "http://localhost:5007", 
      "http://localhost:5008", 
      "http://localhost:5009", 
      "http://localhost:5010", 
      "ws://localhost:*",     // Next.js HMR websocket
      "wss://localhost:*",
    ].join(" ")
  : "'self'";

const nextConfig = {
  allowedDevOrigins: ['10.184.3.133', '14.139.180.41'],

  // Remove the "X-Powered-By: Next.js" header from all responses
  poweredByHeader: false,

  webpack: (config) => {
    // pdfjs-dist includes a Node-only code path that requires 'canvas'.
    // In the browser bundle this module is never actually used, so we
    // tell webpack to resolve it to an empty module.
    config.resolve.alias.canvas = false;
    return config;
  },

  // Enable gzip/brotli compression on all responses
  compress: true,

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5001/api/:path*",
      },
      {
        // Proxy backend upload files (photos, PDFs stored by user_service)
        source: "/uploads/:path*",
        destination: "http://localhost:5001/uploads/:path*",
      },
    ];
  },

  async headers() {
    return [
      // Cache static Next.js assets aggressively (they are content-hashed)
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Cache public folder assets (images, icons, etc.)
      // Next.js route patterns don't support regex groups — use separate entries
      {
        source: "/:path*.ico",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/:path*.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/:path*.jpg",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/:path*.svg",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/:path*.webp",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/:path*.woff2",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      // Security headers on all pages
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Suppress any server/framework identification headers that may be
          // injected by a reverse proxy (e.g. Apache) in front of this app.
          { key: "X-Powered-By", value: "" },
          { key: "Server", value: "" },
          // VAPT Vuln #12 – Strict-Transport-Security (HSTS)
          // Forces HTTPS for 1 year; includeSubDomains covers *.bosschn.in
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          // VAPT Vuln #13 – Content-Security-Policy
          // Restrictive policy tailored to this Next.js + React application.
          // 'self' covers the same origin; 'unsafe-inline' for styles is
          // required by Tailwind / Radix UI inline styles.  Script hashes or
          // nonces should be preferred in a future hardening pass once all
          // inline event handlers are removed.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Allow Google Fonts stylesheets (the @import in the HTML head)
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob:",
              // Allow Google Fonts to serve the actual font files
              "font-src 'self' data: https://fonts.gstatic.com",
              // Backend API calls + HMR websocket in dev; tightened in prod
              `connect-src ${connectSrc}`,
              "object-src 'none'",
              "frame-src 'self' blob:",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          // VAPT Vuln #14 – Permissions-Policy
          // Disable browser features not used by this application
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "fullscreen=(self)",
              "payment=()",
              "usb=()",
            ].join(", "),
          },
          // VAPT Vuln #15 – Cross-Origin-Embedder-Policy
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          // VAPT Vuln #16 – Cross-Origin-Resource-Policy
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          // Bonus: Cross-Origin-Opener-Policy (related isolation header)
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
