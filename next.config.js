/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // 本番のドメイン（eatin-map.jp）以外で開かれたとき（workers.dev の確認用URLなど）は、
  // 検索結果に出さないよう noindex を付ける。同じ中身のページが2か所で登録されるのを防ぐため
  async headers() {
    return [
      {
        source: "/:path*",
        missing: [{ type: "host", value: "(www\\.)?eatin-map\\.jp" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

module.exports = nextConfig;
