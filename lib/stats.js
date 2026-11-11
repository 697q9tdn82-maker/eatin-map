// ============================================================
// 掲載店舗数の集計
//
// 「何店舗のイートイン情報が載っているか」を返します。数えるのは次のどちらかに当てはまる店（重複は1店）:
//   ・Firestoreに投稿（人の投稿・AI推定）がある店
//   ・チェーンの公式サイトに「イートインあり」と出ている店（地図では「たぶんあり（要確認）」）
// 週1回だけ数えてキャッシュするので、何人がアクセスしても負荷は増えません。
//
// 【方針】
// ・集計に失敗したら null を返す（固定値でごまかさない）
// ・失敗した理由を diag に残す（/api/stats で確認できる）
// ・エリアページで実績のある runQuery（POST）方式を使う
//
// ※ 手動で数字を固定したいときは MANUAL_COUNT に数値を入れてください。
// ============================================================

import { canonicalPlaceId } from "./eatin-data";
// 公式サイトに「イートインあり」と出ている店の店舗ID一覧（ビルドのたびに scripts/make-store-tiles.mjs が作る）
import OFFICIAL_EATIN_IDS from "../data/generated/official-eatin-ids.json";

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
    placeIds.add(canonicalPlaceId(id)); // 以前のIDと今のIDの投稿を同じ店として数える
  }
  return { ok: true, method: "runQuery", count: placeIds.size, posts, ids: placeIds };
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
      if (id) placeIds.add(canonicalPlaceId(id));
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return { ok: true, method: "list", count: placeIds.size, posts, ids: placeIds };
}

// 集計の内訳を返す
//   count  : 掲載店舗数＝投稿がある店＋公式サイトで「イートインあり」の店（重複は1店。失敗時は null）
//   posted : そのうち投稿がある店の数
//   official : そのうち公式サイトで「イートインあり」の店の数
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
        const all = new Set(r.ids);
        for (const id of OFFICIAL_EATIN_IDS) all.add(id);
        return { count: all.size, posted: r.count, official: OFFICIAL_EATIN_IDS.length, posts: r.posts, source: "live", method: r.method };
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
