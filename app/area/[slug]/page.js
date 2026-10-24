import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import EatInFinder from "../../EatInFinder";
import AreaInfo from "../AreaInfo";
import { AREAS } from "../../../lib/areas";
import { getAreaData, nearbyAreas, stationName, AREA_RADIUS } from "../../../lib/area-data";
import { formatJaDate } from "../../../lib/eatin-data";

// エリア別ページ（例: /area/shinjuku）
//
// 【v4での変更点（AdSense対策）】
// ・店舗一覧が本番で出ていなかった問題を修正（Places取得の失敗結果がキャッシュされていた）
// ・ビルド時に68エリア分のPlaces APIを一斉に呼ばない（アクセスされた時に1回だけ作って1日保存）
// ・データから作る固有の紹介文・おすすめ店・エリアFAQを追加
// ・情報が少ないエリアは noindex（検索結果に出さない）にして、薄いページでサイト評価を下げない

export const revalidate = 86400; // ページを1日ごとに自動再生成

// 空配列＝ビルド時には作らず、最初にアクセスされた時に作って保存する（ISR）
export function generateStaticParams() {
  return [];
}

const loadArea = cache(getAreaData); // 同じリクエスト内でのデータ取得を1回にまとめる

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const area = AREAS[slug];
  if (!area) return {};
  const st = stationName(area);
  const data = await loadArea(slug);
  const yesCount = data?.yes.length || 0;
  const title = yesCount > 0
    ? `${st}周辺のイートインがあるコンビニ${yesCount}店｜座れるコンビニマップ`
    : `${st}周辺のコンビニイートイン情報｜座れるコンビニマップ`;
  const description = data && data.stores.length > 0
    ? `${st}から徒歩圏内のコンビニ${data.stores.length}店舗を調査。イートインあり${yesCount}店・なし${data.no.length}店を一覧と地図で紹介。席数やコンセントの有無、実際に行った人のコメントも掲載。`
    : `${area.pref}${area.name}エリアでイートイン席のあるコンビニを地図で検索。ランチや休憩に使える座れるコンビニが見つかります。`;
  return {
    title,
    description,
    alternates: { canonical: `https://www.eatin-map.jp/area/${slug}` },
    // 情報が少ないうちは検索結果に出さない（リンクはたどってもらう）
    ...(data?.indexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title,
      description,
      url: `https://www.eatin-map.jp/area/${slug}`,
      siteName: "コンビニイートインマップ",
      locale: "ja_JP",
      type: "website",
      images: ["https://www.eatin-map.jp/og-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://www.eatin-map.jp/og-image.png"],
    },
  };
}

const sectionStyle = { background: "#fff", padding: "18px 16px", borderTop: "1px solid #eee" };
const h2Style = { fontSize: "15px", fontWeight: 900, margin: "0 0 10px" };
const pStyle = { fontSize: "13px", color: "#444", lineHeight: 1.9, margin: "0 0 8px" };

function chainSentence(chainCounts) {
  const entries = Object.entries(chainCounts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "";
  return entries.map(([c, n]) => `${c}${n}店`).join("・");
}

export default async function AreaPage({ params }) {
  const { slug } = await params;
  const area = AREAS[slug];
  if (!area) notFound();
  const st = stationName(area);

  const data = await loadArea(slug);
  const { stores, yes, no, unknown, humanConfirmedYes, chainCounts, withOutlet, withSeats, lastPostedAt, mapStores } = data;
  const near = nearbyAreas(slug, 8);
  const top = yes.slice(0, 3);

  const badge = s =>
    s.hasEatIn === true ? { text: s.aiOnly ? "🪑 イートインあり（AI推定）" : "🪑 イートインあり（投稿で確認）", bg: "#e3f2fd", color: "#0077b6" } :
    s.hasEatIn === false ? { text: "イートインなし", bg: "#f5f5f5", color: "#888" } :
    { text: "❓ 未確認（情報募集中）", bg: "#fff3e0", color: "#e65100" };

  // ---- エリアFAQ（データから作る。ページごとに中身が違う） ----
  const faqs = [];
  if (stores.length > 0) {
    faqs.push({
      q: `${st}の近くでイートインがあるコンビニはどこですか？`,
      a: yes.length > 0
        ? `駅から半径約${AREA_RADIUS}mの範囲では、${yes.slice(0, 5).map(s => s.name).join("、")}${yes.length > 5 ? `など${yes.length}店` : ""}にイートイン席があるという情報が寄せられています。最新の状況は店舗で確認してください。`
        : `駅から半径約${AREA_RADIUS}mの範囲では、現時点でイートイン席があると確認できた店舗はありません。未確認の店舗が${unknown.length}店あるため、訪れた方の情報をお待ちしています。`,
    });
    faqs.push({
      q: `${st}周辺のコンビニでコンセントが使える店はありますか？`,
      a: withOutlet.length > 0
        ? `利用者の投稿では、${withOutlet.slice(0, 3).map(s => s.name).join("、")}でコンセント付きの席があると報告されています。利用可否は店内の掲示に従ってください。`
        : `現時点ではコンセントの有無について投稿がありません。地図から店舗を選んで「コンセントあり」を投稿していただくと、次に探す人の役に立ちます。`,
    });
    faqs.push({
      q: `${st}周辺のイートイン情報はどれくらい正確ですか？`,
      a: `掲載している${stores.length}店舗のうち、${humanConfirmedYes.length + no.filter(s => !s.aiOnly).length}店は実際に訪れた利用者の投稿で確認された情報、${stores.filter(s => s.aiOnly).length}店は公開クチコミをもとにしたAI推定です。${lastPostedAt ? `このエリアの最新の投稿は${formatJaDate(lastPostedAt)}です。` : ""}イートインは店舗の判断で休止・再開されることがあるため、参考情報としてご利用ください。`,
    });
  }

  const jsonLd = [
    stores.length > 0 && {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${st}周辺のコンビニ イートイン情報`,
      numberOfItems: stores.length,
      itemListElement: stores.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "ConvenienceStore",
          name: s.name,
          address: s.address,
          ...(s.lat && s.lng ? { geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng } } : {}),
        },
      })),
    },
    faqs.length > 0 && {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ].filter(Boolean);

  return (
    <div style={{ fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", background: "#f4f5f7", color: "#1a1a1a", paddingBottom: 40 }}>
      {jsonLd.map((j, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }} />
      ))}

      {/* 紹介文（AreaInfoで包む＝地図で別の場所を検索したら自動で消える） */}
      <AreaInfo>
        <div style={{ background: "#fff", padding: "16px 16px 12px", borderBottom: "1px solid #eee" }}>
          <nav style={{ fontSize: "11px", color: "#999", marginBottom: 6 }}>
            <Link href="/" style={{ color: "#999" }}>トップ</Link> ＞ <Link href="/area" style={{ color: "#999" }}>エリア一覧</Link> ＞ {area.name}
          </nav>
          <h1 style={{ fontSize: "17px", fontWeight: 900, margin: 0, lineHeight: 1.5 }}>
            {st}周辺のイートインがあるコンビニ
          </h1>
          {stores.length > 0 ? (
            <p style={{ fontSize: "12.5px", color: "#555", margin: "8px 0 0", lineHeight: 1.8 }}>
              {area.pref}・{st}から半径約{AREA_RADIUS}m（徒歩7〜8分圏）にあるコンビニ<strong>{stores.length}店舗</strong>のうち、
              イートイン席があるのは<strong style={{ color: "#0077b6" }}>{yes.length}店</strong>、ないのは{no.length}店、未確認は{unknown.length}店です
              {lastPostedAt && <>（最新の投稿：{formatJaDate(lastPostedAt)}）</>}。一覧は地図の下にあります。
            </p>
          ) : (
            <p style={{ fontSize: "12.5px", color: "#555", margin: "8px 0 0", lineHeight: 1.8 }}>
              {area.pref}{area.name}エリアでイートイン席のあるコンビニを地図から探せます。
            </p>
          )}
        </div>
      </AreaInfo>

      {/* 地図（開いた瞬間にこのエリアを自動検索） */}
      <EatInFinder initialLat={area.lat} initialLng={area.lng} initialStores={mapStores} />

      <AreaInfo>
        {stores.length > 0 && (
          <>
            {/* エリアのまとめ（データから自動で作る固有の解説） */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>{st}周辺のイートイン事情</h2>
              <p style={pStyle}>
                {st}の半径約{AREA_RADIUS}m以内では、Googleマップに登録されているコンビニが{stores.length}店舗見つかりました。
                そのうちイートイン有無の情報があるのは{yes.length + no.length}店で、
                イートインありの割合は{yes.length + no.length > 0 ? Math.round((yes.length / (yes.length + no.length)) * 100) : 0}%です。
                {yes.length > 0 && <>イートインがある店をチェーン別に見ると、{chainSentence(chainCounts)}となっています。</>}
              </p>
              <p style={pStyle}>
                {humanConfirmedYes.length > 0
                  ? <>このうち{humanConfirmedYes.length}店は、実際に訪れた利用者の投稿で「イートインあり」が確認されています。</>
                  : <>イートインありの情報は現在すべてAIによる推定で、利用者による確認はまだありません。</>}
                {withSeats.length > 0 && <>席数の投稿がある店では、{withSeats.map(s => `${s.name}が約${s.seats}席`).slice(0, 3).join("、")}と報告されています。</>}
                {withOutlet.length > 0 && <>コンセントが使えるという投稿は{withOutlet.length}店にあります。</>}
              </p>
              {unknown.length > 0 && (
                <p style={{ ...pStyle, margin: 0 }}>
                  まだ{unknown.length}店が未確認です。近くを通ったら、地図で店舗を選んで「イートインあった／なかった」をワンタップで教えてください。
                </p>
              )}
            </section>

            {/* おすすめ */}
            {top.length > 0 && (
              <section style={sectionStyle}>
                <h2 style={h2Style}>まず行くならこの{top.length}店</h2>
                <p style={{ ...pStyle, fontSize: "12px", color: "#777" }}>利用者の確認がある店を優先し、駅に近い順に選んでいます。</p>
                <ol style={{ margin: 0, paddingLeft: 20, listStyleType: "decimal" }}>
                  {top.map(s => (
                    <li key={s.placeId} style={{ fontSize: "13px", lineHeight: 1.8, marginBottom: 6 }}>
                      <strong>{s.name}</strong>
                      {s.dist != null && <>（駅中心から直線約{s.dist}m）</>}
                      {s.seats != null && <>・約{s.seats}席</>}
                      {s.outlet && <>・コンセントあり</>}
                      {s.comment && <div style={{ fontSize: "12px", color: "#666" }}>💬 「{s.comment}」</div>}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* 店舗リスト */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>{st}周辺のコンビニ イートイン情報一覧（{stores.length}店）</h2>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {stores.map(s => (
                  <li key={s.placeId} style={{ borderBottom: "1px solid #f0f0f0", padding: "10px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Link
                        href={`/?lat=${s.lat}&lng=${s.lng}&place=${s.placeId}`}
                        style={{ fontSize: "13px", fontWeight: 800, color: "#1a1a1a", textDecoration: "none" }}
                      >
                        {s.name}
                      </Link>
                      <span style={{ fontSize: "10px", fontWeight: 800, background: badge(s).bg, color: badge(s).color, borderRadius: 10, padding: "2px 8px" }}>
                        {badge(s).text}
                      </span>
                      {s.outlet && <span style={{ fontSize: "10px", color: "#666" }}>🔌 コンセント</span>}
                      {s.wifi && <span style={{ fontSize: "10px", color: "#666" }}>📶 Wi-Fi</span>}
                      {s.seats != null && <span style={{ fontSize: "10px", color: "#666" }}>🪑 約{s.seats}席</span>}
                    </div>
                    <div style={{ fontSize: "11px", color: "#888", marginTop: 3 }}>
                      {s.address}{s.dist != null && <>（駅中心から約{s.dist}m）</>}
                    </div>
                    {s.comment && (
                      <div style={{ fontSize: "11px", color: "#555", marginTop: 3 }}>💬 「{s.comment}」</div>
                    )}
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: "11px", color: "#999", marginTop: 10, lineHeight: 1.7 }}>
                ※ 店舗はGoogleマップの登録情報、イートイン情報は利用者の投稿とAI推定（公開クチコミの分析）をもとにしています。
                イートインは店舗の判断で休止・再開されることがあり、最新の状況と異なる場合があります。
                情報の仕組みは<Link href="/about" style={{ color: "#999" }}>このサイトについて</Link>をご覧ください。
              </p>
            </section>

            {/* エリアFAQ */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>{st}周辺のイートインに関する質問</h2>
              {faqs.map((f, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: "13px", fontWeight: 800, margin: "0 0 4px", color: "#e63946" }}>Q. {f.q}</h3>
                  <p style={{ ...pStyle, margin: 0 }}>{f.a}</p>
                </div>
              ))}
            </section>
          </>
        )}

        {/* 読みもの */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>イートインを使う前に</h2>
          <p style={{ ...pStyle, margin: 0 }}>
            店内で食べるときは消費税が10%になるため、レジで「店内で食べます」と伝えるのがルールです。
            詳しくは<Link href="/guide/manner" style={{ color: "#e63946", fontWeight: 700 }}>イートインの使い方とマナー</Link>、
            外から見分けるコツは<Link href="/guide/how-to-find" style={{ color: "#e63946", fontWeight: 700 }}>イートインがあるコンビニの見分け方</Link>で解説しています。
          </p>
        </section>
      </AreaInfo>

      {/* 近くのエリア */}
      <div style={{ background: "#fff", padding: "14px 16px 24px", borderTop: "1px solid #eee" }}>
        <div style={{ fontSize: "12px", fontWeight: 800, color: "#888", marginBottom: 8 }}>🗾 {area.name}から近いエリア</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {near.map(a => (
            <Link key={a.slug} href={`/area/${a.slug}`} style={{ fontSize: "12px", fontWeight: 700, color: "#0077b6", background: "#e3f2fd", borderRadius: 20, padding: "5px 12px", textDecoration: "none" }}>{a.name}</Link>
          ))}
          <Link href="/area" style={{ fontSize: "12px", fontWeight: 700, color: "#555", background: "#f0f0f0", borderRadius: 20, padding: "5px 12px", textDecoration: "none" }}>全エリア一覧 →</Link>
        </div>
      </div>
    </div>
  );
}
