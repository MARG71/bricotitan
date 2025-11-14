import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Cloudinary
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      // Fallback origen AFT (mientras migras)
      { protocol: 'https', hostname: 'www.aftgrupo.com' },
      { protocol: 'https', hostname: 'aftgrupo.com' },
    ],
  },
};

export default nextConfig;
