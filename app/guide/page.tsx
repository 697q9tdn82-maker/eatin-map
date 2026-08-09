import Link from "next/link";

export const metadata = {
  title: "イートイン活用ガイド｜コンビニイートインマップ",
  description: "コンビニイートインの使い方・マナー・チェーン別の特徴など、イートインを賢く活用するためのガイド記事一覧です。",
  alternates: { canonical: "https://www.eatin-map.jp/guide" },
};

const ARTICLES = [
  {
    href: "/guide/manner",
    emoji: "🪑",
    title: "コンビニイートインの使い方とマナー完全ガイド",
    desc: "初めてでも安心。買ってから座る？どれくらい居ていい？税率の違いは？イートインの基本ルールとマナーをまとめました。",
  },
  {
    href: "/guide/chains",
    emoji: "🏪",
    title: "セブン・ファミマ・ローソン イートイン比較",
    desc: "大手3チェーンのイートインの特徴・見つけ方・設備の傾向を比較。自分の使い方に合うチェーンが分かります。",
  },
  {
    href: "/guide/break-spots",
    emoji: "💼",
    title: "外回り営業のための「座れる場所」戦略",
    desc: "カフェ代を月1万円節約する。外回り・フリーランスのための、コンビニイートインを軸にした休憩スポットの見つけ方。",
  },
];

export default function GuideIndex() {
  return (
    <div style={{ fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", position: "fixed", inset: 0, overflowY: "auto", background: "#fff9f9", padding: "0 0 80px" }}>
      <div style={{ background: "#e63946", padding: "28px 24px 24px" }}>
        <Link href="/" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "13px" }}>← マップに戻る</Link>
        <h1 style={{ fontSize: "22px", fontWeight: 900, color: "#fff", margin: "12px 0 4px" }}>イートイン活用ガイド</h1>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", margin: 0 }}>コンビニイートインを賢く使うための読みもの</p>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px" }}>
        {ARTICLES.map(a => (
          <Link key={a.href} href={a.href} style={{ display: "block", background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", textDecoration: "none" }}>
            <div style={{ fontSize: "26px", marginBottom: 6 }}>{a.emoji}</div>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "#1a1a1a", marginBottom: 6, lineHeight: 1.5 }}>{a.title}</div>
            <div style={{ fontSize: "13px", color: "#777", lineHeight: 1.8 }}>{a.desc}</div>
            <div style={{ fontSize: "12px", color: "#e63946", fontWeight: 700, marginTop: 8 }}>読む →</div>
          </Link>
        ))}

        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: "13px", color: "#777", lineHeight: 1.8 }}>
            短い疑問への答えは<Link href="/faq" style={{ color: "#e63946", fontWeight: 700 }}>よくある質問</Link>にまとめています。
            記事で紹介しているイートインのあるコンビニは、<Link href="/" style={{ color: "#e63946", fontWeight: 700 }}>マップ</Link>から実際に探せます。エリア別のページは<Link href="/area/shinjuku" style={{ color: "#e63946", fontWeight: 700 }}>新宿</Link>・<Link href="/area/umeda" style={{ color: "#e63946", fontWeight: 700 }}>梅田</Link>など全国68か所に対応しています。
          </div>
        </div>
      </div>
    </div>
  );
}
