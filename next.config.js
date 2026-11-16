/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // 本番のドメイン（eatin-map.jp）以外で開かれたとき（workers.dev の確認用URLなど）は、
  // 検索結果に出さないよう noindex を付ける。同じ中身のページが2か所で登録されるのを防ぐため
  async headers() {
    return [
      // どのページにも付ける基本の安全設定
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },                       // ファイルの種類を勝手に解釈させない
          { key: "X-Frame-Options", value: "SAMEORIGIN" },                           // 他サイトの枠の中に表示させない（なりすまし画面対策）
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },      // 外部サイトへは最小限の情報だけ渡す
          { key: "Strict-Transport-Security", value: "max-age=31536000" },           // 常にhttpsで開かせる
        ],
      },
      {
        source: "/:path*",
        missing: [{ type: "host", value: "(www\\.)?eatin-map\\.jp" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

module.exports = nextConfig;
