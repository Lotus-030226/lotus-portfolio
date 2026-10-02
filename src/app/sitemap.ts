import type { MetadataRoute } from 'next';
import { siteUrl } from '../lib/utils/paths';
export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
  const url = siteUrl();
  return url
    ? [
        { url: url.toString() },
        {
          url: new URL(
            `${url.pathname.replace(/\/$/, '')}/projects/`,
            url,
          ).toString(),
        },
      ]
    : [];
}
