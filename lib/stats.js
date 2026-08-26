// ============================================================
// 掲載店舗数の集計
//
// Firestoreの投稿データを数えて「何店舗の情報が載っているか」を返します。
// 週1回だけ数えてキャッシュするので、何人がアクセスしても負荷は増えません。
//
// ※ 手動で数字を固定したくなったら、下の MANUAL_COUNT に数値を入れてください
//   （例: const MANUAL_COUNT = 600;）。nullのままなら自動集計します。
// ============================================================

const MANUAL_COUNT = null;

// 集計に失敗したときに表示する数（最後に確認した実数）
const FALLBACK_COUNT = 600;

const PROJECT_ID = "eatin-map-ee417";
const API_KEY = "AIzaSyB5eSZLCsrCCuUKXdmKwZyUxqlNbPBpZoI";

// 「何店舗ぶんの情報があるか」を数える
// 同じ店に複数の投稿があっても1店舗として数えます
export async function getStoreCount() {
  if (MANUAL_COUNT !== null) return MANUAL_COUNT;

  try {
    const placeIds = new Set();
    let pageToken = "";

    // 1回で最大300件ずつ、全部読み終わるまで繰り返す（最大10回で打ち切り）
    for (let i = 0; i < 10; i++) {
      const url =
        `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/verifications` +
        `?key=${API_KEY}&pageSize=300&mask.fieldPaths=placeId` +
        (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");

      const res = await fetch(url, { next: { revalidate: 604800 } }); // 週1回だけ取得
      if (!res.ok) break;
      const data = await res.json();

      for (const doc of data.documents || []) {
        const id = doc.fields?.placeId?.stringValue;
        if (id) placeIds.add(id);
      }

      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }

    // 極端に少ない場合は集計失敗とみなす（通信エラーなどで途中で切れたとき）
    if (placeIds.size < 10) return FALLBACK_COUNT;

    return placeIds.size;
  } catch {
    return FALLBACK_COUNT;
  }
}
