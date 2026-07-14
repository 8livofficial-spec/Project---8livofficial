import type { NextConfig } from "next";
import dotenv from "dotenv";
import path from "path";

// Explicitly load .env.local on startup to ensure Turbopack/Next.js has all environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), "frontend", ".env.local") });

const nextConfig: NextConfig = {
  // other config options...
  allowedDevOrigins: ["little-emote-livestock.ngrok-free.dev", "172.21.100.123"],
  images: {
    qualities: [72, 75, 78],
  },
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(), payment=(self)',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
