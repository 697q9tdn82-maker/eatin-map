import Link from "next/link";
import PageShell, { card, linkStyle } from "../components/PageShell";
import { GUIDES } from "../../lib/guides";

export const metadata = {
  title: "イートイン活用ガイド｜コンビニイートインマップ",
  description: "コンビニイートインの見分け方・使い方・マナー・500円ランチ・作業や充電のルール・チェーン別の特徴、独自データのレポートなど、イートインを賢く活用するための読みもの一覧です。",
  alternates: { canonical: "https://www.eatin-map.jp/guide" },
};

export default function GuideIndex() {
  return (
    <PageShell title="イートイン活用ガイド" subtitle="コンビニイートインを賢く使うための読みもの">
      {GUIDES.map(a => (
        <Link key={a.href} href={a.href} style={{ ...card, display: "block", textDecoration: "none" }}>
          <div style={{ fontSize: "26px", marginBottom: 6 }}>{a.emoji}</div>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#1a1a1a", margin: "0 0 6px", lineHeight: 1.5 }}>{a.title}</h2>
          <div style={{ fontSize: "13px", color: "#777", lineHeight: 1.8 }}>{a.desc}</div>
          <div style={{ fontSize: "12px", color: "#e63946", fontWeight: 700, marginTop: 8 }}>読む →</div>
        </Link>
      ))}

      <div style={card}>
        <div style={{ fontSize: "13px", color: "#777", lineHeight: 1.8 }}>
          短い疑問への答えは<Link href="/faq" style={linkStyle}>よくある質問</Link>にまとめています。
          イートインのあるコンビニは<Link href="/" style={linkStyle}>マップ</Link>から探せるほか、
          <Link href="/area" style={linkStyle}>エリア一覧</Link>から新宿・東京駅・梅田など主要駅ごとのページも見られます。
        </div>
      </div>
    </PageShell>
  );
}
