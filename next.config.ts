import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Production optimizations */
  reactStrictMode: true,

  // Disable source maps in production for security
  productionBrowserSourceMaps: false,

  // Optimize images
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 60,
  },

  // Compiler options
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },


  // Disable x-powered-by header for security
  poweredByHeader: false,
};

export default nextConfig;
