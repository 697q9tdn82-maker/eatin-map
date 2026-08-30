// ============================================================
// 掲載店舗数の集計
//
// Firestoreの投稿データを数えて「何店舗の情報が載っているか」を返します。
// 週1回だけ数えてキャッシュするので、何人がアクセスしても負荷は増えません。
//
// 【方針】
// ・集計に失敗したら null を返す（固定値でごまかさない）
// ・失敗した理由を diag に残す（/api/stats で確認できる）
// ・エリアページで実績のある runQuery（POST）方式を使う
//
// ※ 手動で数字を固定したいときは MANUAL_COUNT に数値を入れてください。
// ============================================================

const MANUAL_COUNT = null;

const PROJECT_ID = "eatin-map-ee417";
const API_KEY = "AIzaSyB5eSZLCsrCCuUKXdmKwZyUxqlNbPBpZoI";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// --- 方式A: runQuery（エリアページで実績のあるPOST方式） ---
async function countByRunQuery() {
  const res = await fetch(`${BASE}:runQuery?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "verifications" }],
        select: { fields: [{ fieldPath: "placeId" }] },
      },
    }),
    next: { revalidate: 604800 }, // 週1回だけ取得
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, method: "runQuery", status: res.status, error: body.slice(0, 300) };
  }

  const rows = await res.json();
  const placeIds = new Set();
  let posts = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = row.document?.fields?.placeId?.stringValue;
    if (!id) continue;
    posts++;
    placeIds.add(id);
  }
  return { ok: true, method: "runQuery", count: placeIds.size, posts };
}

// --- 方式B: documents一覧（GET・ページ送り） ---
async function countByList() {
  const placeIds = new Set();
  let posts = 0;
  let pageToken = "";

  for (let i = 0; i < 20; i++) {
    const url =
      `${BASE}/verifications?key=${API_KEY}&pageSize=300&mask.fieldPaths=placeId` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");

    const res = await fetch(url, { next: { revalidate: 604800 } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, method: "list", status: res.status, error: body.slice(0, 300) };
    }

    const data = await res.json();
    for (const doc of data.documents || []) {
      posts++;
      const id = doc.fields?.placeId?.stringValue;
      if (id) placeIds.add(id);
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return { ok: true, method: "list", count: placeIds.size, posts };
}

// 集計の内訳を返す
//   count  : ユニークな店舗数（失敗時は null）
//   posts  : 投稿の総件数
//   source : "manual" | "live" | "failed"
//   diag   : 失敗したときの手がかり（どの方式で何が起きたか）
export async function getStoreStats() {
  if (MANUAL_COUNT !== null) {
    return { count: MANUAL_COUNT, posts: null, source: "manual" };
  }

  const diag = [];

  // 実績のあるrunQueryを先に試し、ダメなら一覧方式にフォールバックする
  for (const attempt of [countByRunQuery, countByList]) {
    try {
      const r = await attempt();
      if (r.ok && r.count > 0) {
        return { count: r.count, posts: r.posts, source: "live", method: r.method };
      }
      diag.push({ method: r.method, status: r.status ?? null, error: r.error ?? "count=0" });
    } catch (e) {
      diag.push({ method: attempt.name, error: String(e?.message || e).slice(0, 300) });
    }
  }

  return { count: null, posts: null, source: "failed", diag };
}

// 表示用（店舗数だけ欲しいとき）。失敗時は null
export async function getStoreCount() {
  const { count } = await getStoreStats();
  return count;
}
