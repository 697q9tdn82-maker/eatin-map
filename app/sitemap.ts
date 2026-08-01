import { MetadataRoute } from "next";
import { AREAS } from "../lib/areas";

export default function sitemap(): MetadataRoute.Sitemap {
  const areaPages: MetadataRoute.Sitemap = Object.keys(AREAS).map((slug) => ({
    url: `https://www.eatin-map.jp/area/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: "https://www.eatin-map.jp",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...areaPages,
    {
      url: "https://www.eatin-map.jp/about",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: "https://www.eatin-map.jp/guide",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://www.eatin-map.jp/guide/manner",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: "https://www.eatin-map.jp/guide/chains",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: "https://www.eatin-map.jp/guide/break-spots",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: "https://www.eatin-map.jp/privacy",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: "https://www.eatin-map.jp/terms",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
