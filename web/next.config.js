/** @type {import('next').NextConfig} */
// API_URL = server-side proxy target (Docker: http://api:8000)
// NEXT_PUBLIC_API_URL = browser-facing API base (local dev: http://localhost:8000)
const apiUrl =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: "/health",
        destination: `${apiUrl}/health`,
      },
    ];
  },
};

module.exports = nextConfig;
