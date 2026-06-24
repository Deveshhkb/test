/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
    ],
  },
  async rewrites() {
    // Proxy API calls to the backend during local development.
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    return [{ source: '/api/:path*', destination: `${api}/:path*` }];
  },
};

module.exports = nextConfig;
