import Link from "next/link";
import PageShell, { card, h2, p, linkStyle } from "../components/PageShell";
import { AREAS } from "../../lib/areas";

export const metadata = {
  title: "エリア一覧｜駅別にイートインがあるコンビニを探す｜コンビニイートインマップ",
  description: "東京・大阪を中心に全国の主要駅ごとに、イートイン席のあるコンビニをまとめたエリアページの一覧です。新宿・渋谷・東京駅・梅田・難波など。",
  alternates: { canonical: "https://www.eatin-map.jp/area" },
};

export default function AreaIndex() {
  const byPref = {};
  for (const [slug, a] of Object.entries(AREAS)) (byPref[a.pref] ||= []).push([slug, a]);

  return (
    <PageShell title="エリアから探す" subtitle={`駅ごとのイートイン情報ページ（全${Object.keys(AREAS).length}エリア）`}>
      <div style={card}>
        <p style={{ ...p, margin: 0 }}>
          各エリアのページでは、駅から半径約600m（徒歩7〜8分圏）にあるコンビニを調べ、イートイン席の有無・席数・コンセントの有無などを一覧にしています。
          情報は利用者の投稿とAI推定をもとに毎日更新されます。ここにない場所は<Link href="/" style={linkStyle}>マップ</Link>から駅名や現在地で検索できます。
        </p>
      </div>
      {Object.entries(byPref).map(([pref, items]) => (
        <div key={pref} style={card}>
          <h2 style={h2}>{pref}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {items.map(([slug, a]) => (
              <Link key={slug} href={`/area/${slug}`} style={{ fontSize: "13px", fontWeight: 700, color: "#0077b6", background: "#e3f2fd", borderRadius: 20, padding: "6px 13px", textDecoration: "none" }}>
                {a.name}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </PageShell>
  );
}
