/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://ayodhyatour.cloudpunch.in',
  generateRobotsTxt: true,
  sitemapSize: 7000,
  changefreq: 'weekly',
  priority: 0.7,
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/dashboard', '/login', '/register'] },
    ],
    additionalSitemaps: [
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://ayodhyatour.cloudpunch.in'}/sitemap.xml`,
    ],
  },
  exclude: ['/dashboard', '/admin', '/login', '/register'],
};
