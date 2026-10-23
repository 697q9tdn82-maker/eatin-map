import Link from "next/link";
import { AREAS } from "../lib/areas";
import { GUIDES } from "../lib/guides";

// トップページの地図の下に表示する読みもの部分（サーバー側で描画＝検索エンジンにも読まれる）
const POPULAR = ["shinjuku", "shibuya", "ikebukuro", "tokyo", "shinagawa", "shimbashi", "otemachi", "akihabara", "yokohama", "umeda", "namba", "tennoji", "nagoya", "hakata"];

const wrap = { maxWidth: 720, margin: "0 auto", padding: "0 16px" };
const section = { background: "#fff", borderRadius: 12, padding: "18px 18px", marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
const h2 = { fontSize: "16px", fontWeight: 900, margin: "0 0 10px", color: "#1a1a1a" };
const p = { fontSize: "13.5px", color: "#555", lineHeight: 1.9, margin: "0 0 8px" };
const pill = { fontSize: "12.5px", fontWeight: 700, color: "#0077b6", background: "#e3f2fd", borderRadius: 20, padding: "6px 12px", textDecoration: "none" };

export default function HomeContent({ storeCount, areaCount }) {
  return (
    <div style={{ background: "#f4f5f7", padding: "20px 0 90px", fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif" }}>
      <div style={wrap}>
        <section style={section}>
          <h1 style={{ fontSize: "18px", fontWeight: 900, margin: "0 0 10px", lineHeight: 1.5 }}>
            近くの「座れるコンビニ」を地図で探せる、コンビニイートインマップ
          </h1>
          <p style={p}>
            コンビニイートインマップは、イートイン席があるコンビニをチェーンの垣根を越えて探せる無料のウェブサービスです。
            {storeCount ? `現在${storeCount.toLocaleString()}店舗の` : ""}イートイン情報を、実際に行った人の投稿とAI推定をもとに掲載しています。
          </p>
          <p style={{ ...p, margin: 0 }}>
            ランチが1,000円を超えるのも珍しくないいま、飲み物1本で座って休めるコンビニのイートインは、外回りの会社員や移動中の人にとって貴重な休憩場所です。
            ところが当サイトの<Link href="/report" style={{ color: "#e63946", fontWeight: 700 }}>集計</Link>では、都市部の駅周辺で実際にイートインがあるコンビニは決して多くありません。入ってみたら座れなかった、をなくすために作りました。
          </p>
        </section>

        <section style={section}>
          <h2 style={h2}>使い方は3ステップ</h2>
          <ol style={{ ...p, paddingLeft: 20, listStyleType: "decimal", margin: 0 }}>
            <li><strong>探す</strong>：「現在地から探す」か、駅名を入れて検索します。</li>
            <li><strong>選ぶ</strong>：青いピンがイートインあり。絞り込みでコンセントやWi-Fiのある店も探せます。</li>
            <li><strong>教える</strong>：行った店のイートインの有無をワンタップで投稿。次に探す人の助けになります。</li>
          </ol>
          <p style={{ ...p, margin: "8px 0 0" }}>
            詳しくは<Link href="/guide/how-to-use" style={{ color: "#e63946", fontWeight: 700 }}>マップの使い方と投稿のしかた</Link>をご覧ください。
          </p>
        </section>

        <section style={section}>
          <h2 style={h2}>主要駅から探す</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {POPULAR.filter(s => AREAS[s]).map(s => (
              <Link key={s} href={`/area/${s}`} style={pill}>{AREAS[s].name}</Link>
            ))}
            <Link href="/area" style={{ ...pill, color: "#555", background: "#f0f0f0" }}>全{areaCount}エリア →</Link>
          </div>
        </section>

        <section style={section}>
          <h2 style={h2}>イートイン活用ガイド</h2>
          {GUIDES.slice(0, 6).map(g => (
            <Link key={g.href} href={g.href} style={{ display: "block", padding: "10px 0", borderTop: "1px solid #f2f2f2", textDecoration: "none" }}>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#1a1a1a", lineHeight: 1.6 }}>{g.emoji} {g.title}</div>
              <div style={{ fontSize: "12.5px", color: "#777", lineHeight: 1.7, marginTop: 2 }}>{g.desc}</div>
            </Link>
          ))}
          <Link href="/guide" style={{ display: "block", fontSize: "13px", color: "#e63946", fontWeight: 700, marginTop: 8 }}>ガイド記事をすべて見る →</Link>
        </section>

        <section style={section}>
          <h2 style={h2}>情報の仕組みについて</h2>
          <p style={{ ...p, margin: 0 }}>
            店舗の基本情報はGoogleマップ、イートインの有無は利用者の投稿（多数決で判定）と、投稿がない店のみAIによるクチコミ分析で表示しています。
            AI推定は「AI推定」と明記して区別しています。詳しくは<Link href="/about" style={{ color: "#e63946", fontWeight: 700 }}>このサイトについて</Link>、
            よくある疑問は<Link href="/faq" style={{ color: "#e63946", fontWeight: 700 }}>よくある質問</Link>へ。
          </p>
        </section>
      </div>
    </div>
  );
}
