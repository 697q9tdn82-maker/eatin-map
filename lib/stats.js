// ============================================================
// 掲載店舗数の集計
//
// Firestoreの投稿データを数えて「何店舗の情報が載っているか」を返します。
// 週1回だけ数えてキャッシュするので、何人がアクセスしても負荷は増えません。
//
// 【方針】
// 集計に失敗したときは null を返します（固定値でごまかさない）。
// null のときトップページは店舗数の行そのものを表示しないので、
// 「実際と違う数字が出ている」状態になりません。
//
// ※ 手動で数字を固定したいときは MANUAL_COUNT に数値を入れてください。
// ============================================================

const MANUAL_COUNT = null;

const PROJECT_ID = "eatin-map-ee417";
const API_KEY = "AIzaSyB5eSZLCsrCCuUKXdmKwZyUxqlNbPBpZoI";

// 集計の内訳も返す（診断用）
//   count  : ユニークな店舗数（失敗時は null）
//   posts  : 投稿の総件数
//   source : "manual" | "live" | "failed"
export async function getStoreStats() {
  if (MANUAL_COUNT !== null) {
    return { count: MANUAL_COUNT, posts: null, source: "manual" };
  }

  try {
    const placeIds = new Set();
    let posts = 0;
    let pageToken = "";
    let pages = 0;

    // 1回で最大300件ずつ、全部読み終わるまで繰り返す（最大20回で打ち切り＝6000件まで対応）
    for (let i = 0; i < 20; i++) {
      const url =
        `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/verifications` +
        `?key=${API_KEY}&pageSize=300&mask.fieldPaths=placeId` +
        (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");

      const res = await fetch(url, { next: { revalidate: 604800 } }); // 週1回だけ取得
      if (!res.ok) return { count: null, posts: null, source: "failed" };

      const data = await res.json();
      pages++;

      for (const doc of data.documents || []) {
        posts++;
        const id = doc.fields?.placeId?.stringValue;
        if (id) placeIds.add(id);
      }

      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }

    // 1件も取れなかった場合は失敗とみなす
    if (placeIds.size === 0) return { count: null, posts: 0, source: "failed" };

    return { count: placeIds.size, posts, pages, source: "live" };
  } catch {
    return { count: null, posts: null, source: "failed" };
  }
}

// 表示用（店舗数だけ欲しいとき）。失敗時は null
export async function getStoreCount() {
  const { count } = await getStoreStats();
  return count;
}
