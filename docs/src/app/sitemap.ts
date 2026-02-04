import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source.getPages();

  return pages.map((page) => ({
    url: new URL(page.url, 'https://docs.openvideo.dev').toString(),
    lastModified: new Date(), // Ideally use page.data.lastModified if available
    changeFrequency: 'weekly',
    priority: page.url === '/' ? 1 : 0.8,
  }));
}
