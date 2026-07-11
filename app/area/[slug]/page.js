import Link from "next/link";
import { notFound } from "next/navigation";
import EatInFinder from "../../EatInFinder";
import AreaInfo from "../AreaInfo";
import { AREAS } from "../../../lib/areas";

// エリア別ページ（例: /area/shinjuku）
// 「新宿 コンビニ イートイン」などの検索からの流入を狙うSEO用ページ
//
// 【v3での変更点】
// 店舗リストをサーバー側でHTMLに描画するようにしました。
// これまでは地図（ブラウザ側で描画）だけだったので、Googleには
// 店舗名が1つも見えていませんでした。このページでは
//   1. Google Placesでエリア周辺のコンビニを取得（週1回キャッシュ）
//   2. Firestoreのverifications（投稿）と突き合わせてイートイン有無を判定
//   3. 店名・住所・イートイン状況をHTMLとして出力（Googleが読める）
// という流れで、投稿が増えるほどページが検索に強くなります。

export const revalidate = 86400; // ページを1日ごとに自動再生成

// Firebaseの公開設定（lib/firebase.js と同じ。クライアントにも公開されている値なので秘密ではない）
const FIREBASE_PROJECT_ID = "eatin-map-ee417";
const FIREBASE_API_KEY = "AIzaSyB5eSZLCsrCCuUKXdmKwZyUxqlNbPBpZoI";

export function generateStaticParams() {
  return Object.keys(AREAS).map(slug => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const area = AREAS[slug];
  if (!area) return {};
  const title = `${area.name}のコンビニイートイン店舗マップ｜座れるコンビニを探す`;
  const description = `${area.pref}${area.name}エリアでイートイン席のあるコンビニを地図と一覧で検索。ランチや休憩に使える座れるコンビニがすぐ見つかります。登録不要・無料。`;
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

// ---- ① Google Placesでエリア周辺のコンビニを取得（サーバー側） ----
async function fetchAreaStores(area) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({
        includedTypes: ["convenience_store"],
        locationRestriction: {
          circle: { center: { latitude: area.lat, longitude: area.lng }, radius: 1000 },
        },
        languageCode: "ja",
        regionCode: "JP",
        maxResultCount: 20,
      }),
      next: { revalidate: 604800 }, // Places APIの呼び出しは週1回まで（店舗の入れ替わりは少ないので十分・費用も抑えられる）
    });
    const data = await res.json();
    return (data.places || []).map(p => ({
      placeId: p.id,
      name: p.displayName?.text || "",
      address: p.formattedAddress || "",
      lat: p.location?.latitude,
      lng: p.location?.longitude,
    }));
  } catch {
    return []; // 取得に失敗してもページ自体は表示する
  }
}

// ---- ② Firestoreから投稿（verifications）を取得（REST API・読み取りは公開ルール） ----
async function fetchVerifications(placeIds) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;
  const byPlace = {};
  // in句は一度に10件までにしておく（安全策）
  for (let i = 0; i < placeIds.length; i += 10) {
    const chunk = placeIds.slice(i, i + 10);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: "verifications" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "placeId" },
                op: "IN",
                value: { arrayValue: { values: chunk.map(id => ({ stringValue: id })) } },
              },
            },
          },
        }),
        next: { revalidate: 3600 }, // 投稿の反映は1時間ごと
      });
      const rows = await res.json();
      for (const row of Array.isArray(rows) ? rows : []) {
        const fields = row.document?.fields;
        if (!fields) continue;
        const v = parseFields(fields);
        if (!v.placeId) continue;
        (byPlace[v.placeId] ||= []).push(v);
      }
    } catch {
      // 失敗したチャンクはスキップ（リスト自体は表示する）
    }
  }
  return byPlace;
}

// FirestoreのREST形式（{stringValue: "..."} など）を普通のオブジェクトに変換
function parseFields(fields) {
  const out = {};
  for (const [k, f] of Object.entries(fields)) {
    if ("stringValue" in f) out[k] = f.stringValue;
    else if ("booleanValue" in f) out[k] = f.booleanValue;
    else if ("integerValue" in f) out[k] = parseInt(f.integerValue, 10);
    else if ("doubleValue" in f) out[k] = f.doubleValue;
    else if ("timestampValue" in f) out[k] = f.timestampValue;
    else if ("nullValue" in f) out[k] = null;
  }
  return out;
}

// ---- ③ 投稿からイートイン有無を多数決で判定（EatInFinderのaggregateEatInと同じルール） ----
function aggregateEatIn(vers) {
  if (!vers || vers.length === 0) return { status: null, aiOnly: false };
  const human = vers.filter(v => v.source !== "ai");
  const use = human.length > 0 ? human : vers;
  const yes = use.filter(v => v.hasEatIn === true).length;
  const no = use.filter(v => v.hasEatIn === false).length;
  let status = null;
  if (yes > no) status = true;
  else if (no > yes) status = false;
  else {
    const sorted = [...use].sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    status = sorted[sorted.length - 1]?.hasEatIn ?? null;
  }
  return { status, aiOnly: human.length === 0 };
}

// 定型文・AI推定コメントを除いた、人の「生の声」を1件返す（ページの固有テキストになる）
function pickComment(vers) {
  const boring = new Set(["イートインあり", "イートインなし", ""]);
  const human = (vers || [])
    .filter(v => v.source !== "ai" && v.comment && !boring.has(v.comment.trim()) && !v.comment.startsWith("🤖"))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return human[0]?.comment?.slice(0, 80) || null;
}

export default async function AreaPage({ params }) {
  const { slug } = await params;
  const area = AREAS[slug];
  if (!area) notFound();

  // 店舗リストを組み立てる（失敗しても空リストでページは出る）
  const rawStores = await fetchAreaStores(area);
  const versByPlace = rawStores.length > 0 ? await fetchVerifications(rawStores.map(s => s.placeId)) : {};
  const stores = rawStores.map(s => {
    const vers = versByPlace[s.placeId] || [];
    const { status, aiOnly } = aggregateEatIn(vers);
    return {
      ...s,
      hasEatIn: status,
      aiOnly,
      outlet: vers.some(v => v.outlet === true),
      wifi: vers.some(v => v.wifi === true),
      seats: [...vers].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).find(v => v.seats != null)?.seats ?? null,
      humanCount: vers.filter(v => v.source !== "ai").length,
      comment: pickComment(vers),
    };
  });
  // 並び順: イートインあり → 未確認 → なし（同順位内は投稿が多い店を上に）
  const rank = s => (s.hasEatIn === true ? 0 : s.hasEatIn === null ? 1 : 2);
  stores.sort((a, b) => rank(a) - rank(b) || b.humanCount - a.humanCount);

  const countYes = stores.filter(s => s.hasEatIn === true).length;
  const countNo = stores.filter(s => s.hasEatIn === false).length;
  const countUnknown = stores.length - countYes - countNo;
  const others = Object.entries(AREAS).filter(([s]) => s !== slug);

  // 構造化データ（Googleに「これは店舗リストです」と伝える）
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${area.name}のイートインがあるコンビニ`,
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
  };

  const badge = s =>
    s.hasEatIn === true ? { text: s.aiOnly ? "🪑 イートインあり（AI推定）" : "🪑 イートインあり", bg: "#e3f2fd", color: "#0077b6" } :
    s.hasEatIn === false ? { text: "イートインなし", bg: "#f5f5f5", color: "#999" } :
    { text: "❓ 未確認（情報募集中）", bg: "#fff3e0", color: "#e65100" };

  return (
    <div style={{ fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", background: "#f4f5f7", color: "#1a1a1a" }}>
      {stores.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}

      {/* SEO用の紹介文（検索エンジンに読まれる部分）
          AreaInfoで包む＝地図で別の場所を検索したら自動で消える（古い情報が残らない） */}
      <AreaInfo>
      <div style={{ background: "#fff", padding: "16px 16px 12px", borderBottom: "1px solid #eee" }}>
        <h1 style={{ fontSize: "16px", fontWeight: 900, margin: 0 }}>
          {area.name}のコンビニイートインマップ
        </h1>
        <p style={{ fontSize: "12px", color: "#666", margin: "6px 0 0", lineHeight: 1.6 }}>
          {area.pref}{area.name}エリアでイートイン席のあるコンビニを地図と一覧から探せます。
          {stores.length > 0 && (
            <>現在{area.name}周辺のコンビニ{stores.length}店舗のうち、イートインあり{countYes}店・なし{countNo}店・未確認{countUnknown}店。</>
          )}
          実際に行った方の投稿でマップが育ちます。
        </p>
      </div>
      </AreaInfo>

      {/* 地図（開いた瞬間にこのエリアを自動検索） */}
      <EatInFinder initialLat={area.lat} initialLng={area.lng} />

      {/* 店舗リスト（サーバー側で描画するのでGoogleに読まれる）
          こちらもAreaInfoで包み、別の場所を検索したら消えるようにする */}
      {stores.length > 0 && (
        <AreaInfo>
        <div style={{ background: "#fff", padding: "16px", borderTop: "1px solid #eee" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 900, margin: "0 0 10px" }}>
            {area.name}周辺のコンビニ イートイン情報一覧
          </h2>
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
                <div style={{ fontSize: "11px", color: "#888", marginTop: 3 }}>{s.address}</div>
                {s.comment && (
                  <div style={{ fontSize: "11px", color: "#555", marginTop: 3 }}>💬 「{s.comment}」</div>
                )}
              </li>
            ))}
          </ul>
          <p style={{ fontSize: "11px", color: "#999", marginTop: 10, lineHeight: 1.6 }}>
            ※ イートイン情報はユーザーの投稿とAI推定によるもので、最新の状況と異なる場合があります。
            実際に訪れた際は、上の地図から「イートインあり/なし」をワンタップで教えてもらえると助かります。
          </p>
        </div>
        </AreaInfo>
      )}

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
