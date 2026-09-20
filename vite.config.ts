import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const { VITE_SITE_URL } = loadEnv(mode, '.', 'VITE_');
  const site = VITE_SITE_URL ? new URL(VITE_SITE_URL) : null;
  if (site && (!['https:', 'http:'].includes(site.protocol) || site.search || site.hash)) {
    throw new Error('VITE_SITE_URL must be an HTTP(S) website URL without a query or fragment.');
  }
  if (site && !site.pathname.endsWith('/')) site.pathname += '/';
  const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  return {
  base: './',
  plugins: [{
    name: 'site-metadata',
    transformIndexHtml(html) {
      if (!site) return html;
      return {
        html: html.replace(/content="\.\/social-card\.png"/g, `content="${escapeXml(new URL('social-card.png', site).href)}"`),
        tags: [
          { tag: 'link', attrs: { rel: 'canonical', href: site.href }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:url', content: site.href }, injectTo: 'head' },
        ],
      };
    },
    generateBundle() {
      if (!site) return;
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapeXml(site.href)}</loc></url></urlset>\n` });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml', site).href}\n` });
    },
  }],
  build: {
    target: 'es2020',
  },
  };
});
