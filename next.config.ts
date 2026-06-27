// KuMMi School Management System — Next.js Production Configuration
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build as standalone for Docker/VPS deployment
  output: 'standalone',

  transpilePackages: ['sonner'],

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
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
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // Disable powered-by header for security
  poweredByHeader: false,
};

export default nextConfig;
