import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: true,

  // Turbopack stability configuration
  turbopack: {
    // Set explicit root to prevent workspace inference warnings
    root: __dirname,
  },

  // Ensure consistent module resolution
  experimental: {
    // Disable parallel routes optimization that can cause race conditions
    parallelServerCompiles: false,
    parallelServerBuildTraces: false,
  },

  // Service worker cache control headers
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/sw-cache.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
