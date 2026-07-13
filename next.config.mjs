/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL ?? "https://paylance.fabian.web.id";

const nextConfig = {
  // Same-origin proxy: components always call /api/... and we only swap one env
  // var between environments. Skipped in mock mode where no backend is needed.
  async rewrites() {
    if (process.env.NEXT_PUBLIC_READ_SOURCE === "mock") return [];
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
