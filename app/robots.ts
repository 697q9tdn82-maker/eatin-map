import { MetadataRoute } from "next";

// 検索エンジン向けの案内ファイル（https://www.eatin-map.jp/robots.txt として自動公開される）
//
// 【注意】共有リンク（?lat=...&place=...）はここでブロックしません。
// ブロックするとGoogleがページを読めなくなり、「トップページと同じ内容です」
// という指示（canonical / noindex）も伝わらないため、かえって宙ぶらりんになります。
// 代わりに app/page.js 側で noindex と canonical を返しています。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://www.eatin-map.jp/sitemap.xml",
    host: "https://www.eatin-map.jp",
  };
}
