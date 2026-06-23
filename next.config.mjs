/** @type {import('next').NextConfig} */

// When GITHUB_PAGES=true (set by the GitHub Actions deploy workflow) the app is
// built as a fully static export served from https://<user>.github.io/<repo>/.
// Local `npm run dev` / `npm run build` are unaffected.
const isGithubPages = process.env.GITHUB_PAGES === 'true';
const repo = 'test'; // GitHub repository name -> site lives under /test

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  ...(isGithubPages
    ? {
        output: 'export',
        basePath: `/${repo}`,
        assetPrefix: `/${repo}/`,
        trailingSlash: true,
      }
    : {}),
  images: {
    // GitHub Pages has no image optimisation server, so serve images as-is.
    unoptimized: isGithubPages,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    optimizePackageImports: ['react-icons', 'framer-motion', 'gsap'],
  },
  // Custom headers are a server feature and are ignored by static export.
  ...(isGithubPages
    ? {}
    : {
        async headers() {
          return [
            {
              source: '/(.*)',
              headers: [
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
