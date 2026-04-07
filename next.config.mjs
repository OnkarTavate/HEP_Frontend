/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // Update this to 5001 to match your terminal output
        destination: "http://localhost:5001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
