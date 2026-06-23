import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "コンビニイートインマップ",
  description: "近くのコンビニのイートインスペースを探せるマップアプリ。物価高のいま、無料・登録不要で使えます。",
  openGraph: {
    title: "コンビニイートインマップ",
    description: "近くのコンビニのイートインスペースを探せるマップアプリ",
    url: "https://eatin-map.vercel.app",
    siteName: "コンビニイートインマップ",
    images: [
      {
        url: "https://eatin-map.vercel.app/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "コンビニイートインマップ",
    description: "近くのコンビニのイートインスペースを探せるマップアプリ",
    images: ["https://eatin-map.vercel.app/og-image.png"],
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
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}