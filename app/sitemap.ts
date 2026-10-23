import { MetadataRoute } from "next";
import { AREAS } from "../lib/areas";
import { GUIDES } from "../lib/guides";

const BASE = "https://www.eatin-map.jp";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, changeFrequency: "daily" | "weekly" | "monthly", priority: number) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });

  // ※ 情報が少ないエリアページはページ側で noindex にしているので、Googleが自動で判断します
  const areaPages = Object.keys(AREAS).map(slug => page(`/area/${slug}`, "weekly", 0.8));
  const guidePages = GUIDES.map(g => page(g.href, g.href === "/report" ? "daily" : "monthly", 0.7));

  return [
    page("", "daily", 1),
    page("/area", "weekly", 0.8),
    ...areaPages,
    page("/guide", "weekly", 0.7),
    ...guidePages,
    page("/faq", "monthly", 0.6),
    page("/about", "monthly", 0.5),
    page("/contact", "monthly", 0.3),
    page("/privacy", "monthly", 0.3),
    page("/terms", "monthly", 0.3),
  ];
}
