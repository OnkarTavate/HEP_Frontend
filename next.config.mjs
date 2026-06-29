/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['10.184.3.133', '14.139.180.41'],

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
        ],
      },
    ];
  },
};

export default nextConfig;
