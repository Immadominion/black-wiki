/** @type {import('next').NextConfig} */
const nextConfig = {
  // hybrid: pages stay force-static, /api/scan/* runs serverless for the paid scanner
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
