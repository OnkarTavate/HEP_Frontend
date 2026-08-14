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
      "http://localhost:5011",
      "ws://localhost:*",     // Next.js HMR websocket
      "wss://localhost:*",
    ].join(" ")
  : "'self'";

const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  allowedDevOrigins: ['10.184.3.133', '14.139.180.41', '127.0.0.1'],

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
      // ── Auth service (port 5006) ──────────────────────────────────────
      {
        source: "/api/auth/:path*",
        destination: "http://localhost:5006/api/auth/:path*",
      },
      {
        source: "/api/admin/:path*",
        destination: "http://localhost:5006/api/admin/:path*",
      },

      // ── QR service (port 5007) ───────────────────────────────────────
      {
        source: "/api/qr/:path*",
        destination: "http://localhost:5007/api/qr/:path*",
      },

      // ── Approval-admin service (port 5005) ───────────────────────────
      {
        source: "/api/user/:path*",
        destination: "http://localhost:5005/api/user/:path*",
      },
      {
        source: "/api/blacklist/:path*",
        destination: "http://localhost:5005/api/blacklist/:path*",
      },
      {
        source: "/api/overstay/:path*",
        destination: "http://localhost:5005/api/overstay/:path*",
      },
      {
        source: "/api/pass-fee-master/:path*",
        destination: "http://localhost:5005/api/pass-fee-master/:path*",
      },
      {
        source: "/api/hep-rate/:path*",
        destination: "http://localhost:5005/api/hep-rate/:path*",
      },
      {
        source: "/api/bulk-pass/queue",
        destination: "http://localhost:5005/api/bulk-pass/queue",
      },
      {
        source: "/api/bulk-pass/:id/approve",
        destination: "http://localhost:5005/api/bulk-pass/:id/approve",
      },
      {
        source: "/api/bulk-pass/:id/reject",
        destination: "http://localhost:5005/api/bulk-pass/:id/reject",
      },
      {
        source: "/api/bulk-pass/:id/return",
        destination: "http://localhost:5005/api/bulk-pass/:id/return",
      },
      {
        source: "/api/bulk-pass/:batchId/persons/:personId/approve",
        destination:
          "http://localhost:5005/api/bulk-pass/:batchId/persons/:personId/approve",
      },
      {
        source: "/api/bulk-pass/:batchId/persons/:personId/reject",
        destination:
          "http://localhost:5005/api/bulk-pass/:batchId/persons/:personId/reject",
      },
      {
        source: "/api/bulk-pass/:id/finalize",
        destination: "http://localhost:5005/api/bulk-pass/:id/finalize",
      },
      {
        source: "/api/pass-request/agent-pass-request-action",
        destination:
          "http://localhost:5005/api/pass-request/agent-pass-request-action",
      },

      // ── IPORTMAN service (port 5008) ──────────────────────────────────
      {
        source: "/api/cargo",
        destination: "http://localhost:5008/api/cargo",
      },
      {
        source: "/api/cargo/:path*",
        destination: "http://localhost:5008/api/cargo/:path*",
      },
      {
        source: "/api/operator",
        destination: "http://localhost:5008/api/operator",
      },
      {
        source: "/api/operator/:path*",
        destination: "http://localhost:5008/api/operator/:path*",
      },
      // ── TOS service (port 5009) ───────────────────────────────────
      {
        source: "/api/tos",
        destination: "http://localhost:5009/api/tos",
      },
      {
        source: "/api/tos/:path*",
        destination: "http://localhost:5009/api/tos/:path*",
      },
      // ── Customs service (port 5011) ───────────────────────────────────
      {
        source: "/api/customs",
        destination: "http://localhost:5011/api/customs",
      },
      {
        source: "/api/customs/:path*",
        destination: "http://localhost:5011/api/customs/:path*",
      },
      {
        source: "/api/payment/:path*",
        destination: "http://localhost:5010/api/payment/:path*",
      },
      // ── User / Agent service (port 5001) — catch-all ─────────────────
      {
        source: "/api/:path*",
        destination: "http://localhost:5001/api/:path*",
      },

      // ── Static uploads served by user_service ─────────────────────────
      {
        source: "/uploads/:path*",
        destination: "http://localhost:5001/uploads/:path*",
      },
    ];
  },

  async headers() {
    const headers = [
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com http://cdnjs.cloudflare.com https://cdn.jsdelivr.net blob:",
              "worker-src 'self' blob: https://cdnjs.cloudflare.com http://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: http: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' http://localhost:* http://127.0.0.1:* http://10.* http://14.139.180.41:* https://cdnjs.cloudflare.com http://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://tessdata.projectnaptha.com ws: wss:",
              "frame-src 'self' http://localhost:* http://127.0.0.1:* http://10.* http://14.139.180.41:* blob: data:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          // VAPT Vuln #14 – Permissions-Policy
          // Disable browser features not used by this application
          {
            key: "Permissions-Policy",
            value: [
              "camera=(self)",
              "microphone=()",
              "geolocation=()",
              "fullscreen=(self)",
              "payment=()",
              "usb=()",
            ].join(", "),
          },
          // VAPT Vuln #16 – Cross-Origin-Resource-Policy
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          // Bonus: Cross-Origin-Opener-Policy
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];

    if (process.env.NODE_ENV !== "development") {
      headers.unshift({
        // Cache static Next.js assets aggressively in production (they are content-hashed).
        // In development, forcing immutable cache headers can make HMR/page chunks go stale
        // and cause ChunkLoadError when routes like /admin/reports are rebuilt.
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      });
    }

    return headers;
  },
};

export default nextConfig;
