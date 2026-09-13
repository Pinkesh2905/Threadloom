import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
      },
      {
        // Backblaze B2 (the deployed storage backend — see backend/threadloom/settings.py)
        protocol: 'https',
        hostname: 's3.*.backblazeb2.com',
      },
      {
        // Cloudflare R2, in case storage ever moves there instead.
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      {
        // Fallback for locally-served media if USE_S3 is ever off in production.
        protocol: 'https',
        hostname: '*.onrender.com',
      },
    ],
  },
};

export default nextConfig;
