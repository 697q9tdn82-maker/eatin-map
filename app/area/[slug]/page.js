import Link from "next/link";
import { notFound } from "next/navigation";
import EatInFinder from "../../EatInFinder";
import { AREAS } from "../../../lib/areas";

// エリア別ページ（例: /area/shinjuku）
// 「新宿 コンビニ イートイン」などの検索からの流入を狙うSEO用ページ

export function generateStaticParams() {
  return Object.keys(AREAS).map(slug => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const area = AREAS[slug];
  if (!area) return {};
  const title = `${area.name}のコンビニイートイン店舗マップ｜座れるコンビニを探す`;
  const description = `${area.pref}${area.name}エリアでイートイン席のあるコンビニを地図で検索。ランチや休憩に使える座れるコンビニがすぐ見つかります。登録不要・無料。`;
  return {
    title,
    description,
    alternates: { canonical: `https://www.eatin-map.jp/area/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://www.eatin-map.jp/area/${slug}`,
      siteName: "コンビニイートインマップ",
      locale: "ja_JP",
      type: "website",
    },
  };
}

export default async function AreaPage({ params }) {
  const { slug } = await params;
  const area = AREAS[slug];
  if (!area) notFound();

  const others = Object.entries(AREAS).filter(([s]) => s !== slug);

  return (
    <div style={{ fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", background: "#f4f5f7", color: "#1a1a1a" }}>
      {/* SEO用の紹介文（検索エンジンに読まれる部分） */}
      <div style={{ background: "#fff", padding: "16px 16px 12px", borderBottom: "1px solid #eee" }}>
        <h1 style={{ fontSize: "16px", fontWeight: 900, margin: 0 }}>
          {area.name}のコンビニイートインマップ
        </h1>
        <p style={{ fontSize: "12px", color: "#666", margin: "6px 0 0", lineHeight: 1.6 }}>
          {area.pref}{area.name}エリアでイートイン席のあるコンビニを地図から探せます。
          青いピンがイートインあり、オレンジは未確認の店舗です。実際に行った方の投稿でマップが育ちます。
        </p>
      </div>

      {/* 地図（開いた瞬間にこのエリアを自動検索） */}
      <EatInFinder initialLat={area.lat} initialLng={area.lng} />

      {/* 他エリアへのリンク（内部リンクでSEO強化） */}
      <div style={{ background: "#fff", padding: "14px 16px 24px", borderTop: "1px solid #eee" }}>
        <div style={{ fontSize: "12px", fontWeight: 800, color: "#888", marginBottom: 8 }}>🗾 他のエリアから探す</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {others.map(([s, a]) => (
            <Link key={s} href={`/area/${s}`} style={{ fontSize: "12px", fontWeight: 700, color: "#0077b6", background: "#e3f2fd", borderRadius: 20, padding: "5px 12px", textDecoration: "none" }}>{a.name}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
