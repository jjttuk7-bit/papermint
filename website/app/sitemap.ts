import { MetadataRoute } from 'next';
import { getAvailableDates, getAllArxivIds } from '@/lib/db';

const BASE_URL = 'https://papermint-omega.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const dates = getAvailableDates();
  const arxivIds = getAllArxivIds();

  const dateUrls: MetadataRoute.Sitemap = dates.map((date) => ({
    url: `${BASE_URL}/${date}`,
    lastModified: new Date(date),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const paperUrls: MetadataRoute.Sitemap = arxivIds.map((id) => ({
    url: `${BASE_URL}/papers/${id}`,
    changeFrequency: 'monthly',
    priority: 0.9,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...dateUrls,
    ...paperUrls,
  ];
}
