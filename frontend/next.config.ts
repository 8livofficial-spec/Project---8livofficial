import type { NextConfig } from "next";
import dotenv from "dotenv";
import path from "path";

// Explicitly load .env.local on startup to ensure Turbopack/Next.js has all environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), "frontend", ".env.local") });

const nextConfig: NextConfig = {
  // other config options...
  allowedDevOrigins: ["little-emote-livestock.ngrok-free.dev", "172.21.100.123"],
};

export default nextConfig;
