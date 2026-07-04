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
