import { MetadataRoute } from "next";

// 検索エンジン向けの案内ファイル（https://www.eatin-map.jp/robots.txt として自動公開される）
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 共有リンク（?lat=...&place=...）は中身がトップページと同じなのでクロール不要
      disallow: "/?lat=",
    },
    sitemap: "https://www.eatin-map.jp/sitemap.xml",
    host: "https://www.eatin-map.jp",
  };
}
