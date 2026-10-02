import type { MetadataRoute } from 'next';
import { siteUrl } from '../lib/utils/paths';
export const dynamic = 'force-static';
export default function robots(): MetadataRoute.Robots {
  const url = siteUrl();
  return {
    rules: { userAgent: '*', allow: '/' },
    ...(url
      ? {
          sitemap: new URL(
            'sitemap.xml',
            url.toString().replace(/\/?$/, '/'),
          ).toString(),
        }
      : {}),
  };
}
