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
      // Uploaded images served by the backend
      { protocol: 'https', hostname: 'api.ayodhyatour.cloudpunch.in' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  async rewrites() {
    // Proxy API calls to the backend during local development.
    const api = process.env.NEXT_PUBLIC_API_URL || 'https://api.ayodhyatour.cloudpunch.in/api';
    return [{ source: '/api/:path*', destination: `${api}/:path*` }];
  },
};

module.exports = nextConfig;
