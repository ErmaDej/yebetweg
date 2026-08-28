import { writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = 'https://yebetweg.com';

const staticRoutes = [
  { path: '/', changefreq: 'daily', priority: 1.0 },
  { path: '/dashboard', changefreq: 'weekly', priority: 0.8 },
  { path: '/search', changefreq: 'daily', priority: 0.9 },
  { path: '/payment/success', changefreq: 'monthly', priority: 0.5 },
  { path: '/auth/callback', changefreq: 'monthly', priority: 0.3 },
  { path: '/reset-password', changefreq: 'monthly', priority: 0.3 },
  // Static section anchors (handled by SPA, but included for SEO)
  { path: '/#hero', changefreq: 'monthly', priority: 0.7 },
  { path: '/#knowledge', changefreq: 'daily', priority: 0.8 },
  { path: '/#tips', changefreq: 'daily', priority: 0.8 },
  { path: '/#market', changefreq: 'daily', priority: 0.9 },
  { path: '/#marketplace', changefreq: 'daily', priority: 0.9 },
  { path: '/#professionals', changefreq: 'weekly', priority: 0.8 },
  { path: '/#boq', changefreq: 'weekly', priority: 0.8 },
  { path: '/#showcase', changefreq: 'monthly', priority: 0.6 },
  { path: '/#social', changefreq: 'weekly', priority: 0.6 },
  { path: '/#contact', changefreq: 'monthly', priority: 0.5 },
];

function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];

  const urls = staticRoutes.map((route) => {
    return `  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
  </url>`;
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;

  const outputPath = resolve('dist', 'sitemap.xml');
  writeFileSync(outputPath, sitemap);
  console.log(`Sitemap generated at ${outputPath}`);
}

generateSitemap();