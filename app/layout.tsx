import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  verification: {
    google: "hd6AI8K-1PLP8HbJu6uXEPFLWu8SjVe3QmDoDnclfb0",
  },
  title: "コンビニイートインマップ｜近くの座れるコンビニを地図で検索",
  description: "コンビニのイートイン席を地図で検索。新宿・渋谷など全国対応。ランチや休憩に使える座れるコンビニをすぐ探せます。登録不要・無料。",
  openGraph: {
    title: "コンビニイートインマップ｜近くの座れるコンビニを地図で検索",
    description: "コンビニのイートイン席を地図で検索。ランチや休憩に使える座れるコンビニをすぐ探せます。登録不要・無料。",
    url: "https://www.eatin-map.jp",
    siteName: "コンビニイートインマップ",
    images: [
      {
        url: "https://www.eatin-map.jp/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "コンビニイートインマップ｜近くの座れるコンビニを地図で検索",
    description: "コンビニのイートイン席を地図で検索。ランチや休憩に使える座れるコンビニをすぐ探せます。登録不要・無料。",
    images: ["https://www.eatin-map.jp/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#e63946" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="イートインマップ" />
        <link rel="apple-touch-icon" href="/icon.png" />
        {/* Google AdSense（Vercelの環境変数 NEXT_PUBLIC_ADSENSE_ID を設定すると有効になる） */}
        {process.env.NEXT_PUBLIC_ADSENSE_ID && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_ID}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <footer style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #eee", padding: "8px 16px", display: "flex", justifyContent: "center", gap: 20, zIndex: 50, fontSize: "11px" }}>
          <a href="/privacy" style={{ color: "#aaa", textDecoration: "none", fontWeight: 700 }}>プライバシーポリシー</a>
          <a href="/terms" style={{ color: "#aaa", textDecoration: "none", fontWeight: 700 }}>利用規約</a>
          <a href="https://x.com/Eatin_map" target="_blank" rel="noopener noreferrer" style={{ color: "#aaa", textDecoration: "none", fontWeight: 700 }}>𝕏 お問い合わせ</a>
        </footer>
      </body>
    </html>
  );
}
