import { unstable_cache } from "next/cache";

// ============================================================
// Firestoreの投稿（verifications）を読む共通部品（サーバー側専用）
//
// エリアページ・データレポート・トップページで使います。
// REST APIで読み取り（読み取りはFirestoreルールで公開しているので秘密情報は不要）。
// ============================================================

// Firebaseの公開設定（lib/firebase.js と同じ。クライアントにも公開されている値なので秘密ではない）
const FIREBASE_PROJECT_ID = "eatin-map-ee417";
const FIREBASE_API_KEY = "AIzaSyB5eSZLCsrCCuUKXdmKwZyUxqlNbPBpZoI";
const RUN_QUERY_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;

// FirestoreのREST形式（{stringValue: "..."} など）を普通のオブジェクトに変換
function parseFields(fields) {
  const out = {};
  for (const [k, f] of Object.entries(fields || {})) {
    if ("stringValue" in f) out[k] = f.stringValue;
    else if ("booleanValue" in f) out[k] = f.booleanValue;
    else if ("integerValue" in f) out[k] = parseInt(f.integerValue, 10);
    else if ("doubleValue" in f) out[k] = f.doubleValue;
    else if ("timestampValue" in f) out[k] = f.timestampValue;
    else if ("nullValue" in f) out[k] = null;
  }
  return out;
}

async function runQuery(structuredQuery, revalidate) {
  const res = await fetch(RUN_QUERY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery }),
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Firestore runQuery failed: ${res.status}`);
  const rows = await res.json();
  return (Array.isArray(rows) ? rows : [])
    .map(r => (r.document?.fields ? parseFields(r.document.fields) : null))
    .filter(Boolean);
}

// 指定した店舗（placeId）の投稿をまとめて取得 → { placeId: [投稿, ...] }
export async function fetchVerificationsByPlaceIds(placeIds) {
  const byPlace = {};
  // in句は一度に10件までにしておく（安全策）
  for (let i = 0; i < placeIds.length; i += 10) {
    const chunk = placeIds.slice(i, i + 10);
    try {
      const rows = await runQuery({
        from: [{ collectionId: "verifications" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "placeId" },
            op: "IN",
            value: { arrayValue: { values: chunk.map(id => ({ stringValue: id })) } },
          },
        },
      }, 3600); // 投稿の反映は1時間ごと
      for (const v of rows) {
        if (!v.placeId) continue;
        (byPlace[v.placeId] ||= []).push(v);
      }
    } catch {
      // 失敗したチャンクはスキップ（リスト自体は表示する）
    }
  }
  return byPlace;
}

// 全投稿を取得（データレポート用）。1日1回だけ取得してキャッシュ
export const fetchAllVerifications = unstable_cache(
  async () => {
    return runQuery({
      from: [{ collectionId: "verifications" }],
      select: {
        fields: ["placeId", "placeName", "hasEatIn", "source", "outlet", "wifi", "seats", "createdAt"].map(f => ({ fieldPath: f })),
      },
    }, 86400);
  },
  ["all-verifications-v1"],
  { revalidate: 86400 }
);

// ---- 投稿からイートイン有無を多数決で判定（EatInFinderのaggregateEatInと同じルール） ----
// 人の投稿があれば人の投稿だけで判定し、AI推定は人の投稿がない店にだけ使う
export function aggregateEatIn(vers) {
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

// 定型文・AI推定コメントを除いた、人の「生の声」を1件返す
export function pickComment(vers) {
  const boring = new Set(["イートインあり", "イートインなし", ""]);
  const human = (vers || [])
    .filter(v => v.source !== "ai" && v.comment && !boring.has(v.comment.trim()) && !v.comment.startsWith("🤖"))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return human[0]?.comment?.slice(0, 80) || null;
}

// 店名からチェーン名を判定
const CHAINS = [
  ["セブン-イレブン", /セブン/],
  ["ファミリーマート", /ファミリーマート|ファミマ/],
  ["ローソン", /ローソン|LAWSON/i],
  ["ミニストップ", /ミニストップ/],
  ["デイリーヤマザキ", /デイリー|ヤマザキ/],
  ["NewDays", /NewDays|ニューデイズ/i],
  ["セイコーマート", /セイコーマート/],
  ["ポプラ", /ポプラ/],
];
export const MAJOR_CHAINS = ["セブン-イレブン", "ファミリーマート", "ローソン", "ミニストップ"];

export function chainOf(name) {
  for (const [label, re] of CHAINS) if (re.test(name || "")) return label;
  return "その他";
}

// 1店舗分の投稿をまとめて表示用データにする
export function summarizeStore(vers) {
  const { status, aiOnly } = aggregateEatIn(vers);
  const sorted = [...(vers || [])].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return {
    hasEatIn: status,
    aiOnly,
    outlet: (vers || []).some(v => v.outlet === true),
    wifi: (vers || []).some(v => v.wifi === true),
    seats: sorted.find(v => v.seats != null)?.seats ?? null,
    humanCount: (vers || []).filter(v => v.source !== "ai").length,
    lastPostedAt: sorted[0]?.createdAt || null,
    comment: pickComment(vers),
  };
}

// "2026-07-12T05:11:22Z" → "2026年7月12日"
export function formatJaDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const j = new Date(d.getTime() + 9 * 3600 * 1000); // 日本時間
  return `${j.getUTCFullYear()}年${j.getUTCMonth() + 1}月${j.getUTCDate()}日`;
}
