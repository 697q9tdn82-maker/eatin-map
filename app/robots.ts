import { MetadataRoute } from "next";

// 検索エンジン・AI向けの案内ファイル
// （https://www.eatin-map.jp/robots.txt として自動公開される）
//
// 【方針】
// ・通常の検索エンジンもAIも、すべて許可する
// ・AI系のクローラーは名前を明示して許可しておく（ChatGPT・Claude・Perplexity・Geminiなど）
//   ChatGPTやGeminiが回答の中でこのサイトを紹介してくれる可能性を上げるため
//
// 【注意】共有リンク（?lat=...&place=...）はここでブロックしません。
// ブロックするとGoogleがページを読めなくなり、「トップページと同じ内容です」
// という指示（canonical / noindex）も伝わらないため、かえって宙ぶらりんになります。
// 代わりに app/page.js 側で noindex と canonical を返しています。

// AI関連のクローラー
// 前半＝AI検索・回答の引用に使われるもの（これが流入に直結する）
// 後半＝学習に使われるもの（引用の土台になるので合わせて許可）
const AI_BOTS = [
  "OAI-SearchBot",      // ChatGPTの検索
  "ChatGPT-User",       // ChatGPTがユーザーの求めに応じて閲覧
  "Claude-SearchBot",   // Claudeの検索
  "Claude-User",        // Claudeがユーザーの求めに応じて閲覧
  "PerplexityBot",      // Perplexityの検索
  "Perplexity-User",
  "Google-Extended",    // Gemini
  "GPTBot",             // OpenAIの学習用
  "ClaudeBot",          // Anthropicの学習用
  "Applebot-Extended",  // Apple Intelligence
  "Meta-ExternalAgent", // Meta AI
  "CCBot",              // Common Crawl（多くのAIの土台データ）
  "Bingbot",            // Copilotの土台
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...AI_BOTS.map(bot => ({ userAgent: bot, allow: "/" })),
    ],
    sitemap: "https://www.eatin-map.jp/sitemap.xml",
    host: "https://www.eatin-map.jp",
  };
}
