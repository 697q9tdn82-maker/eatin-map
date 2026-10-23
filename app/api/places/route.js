import { fetchNearby, roundCoord } from "../../../lib/places";

// コンビニ検索API
//
// 【コスト対策：キャッシュ】
// Nearby Searchは無料枠が限られ、超えると高額です。
// そこで座標を約100m単位に丸めてからキャッシュすることで、
// 「同じ駅を別の人が検索した」場合にGoogleを呼ばずに済むようにしています。
// キャッシュの中身は lib/places.js にあり、エリアページとも共有しています。

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const latRaw = parseFloat(searchParams.get("lat"));
  const lngRaw = parseFloat(searchParams.get("lng"));
  // 検索半径は100〜2000mに制限し、100m単位に丸める（キャッシュを効きやすくするため）
  const radiusRaw = parseFloat(searchParams.get("radius") || "500") || 500;
  const radius = Math.min(2000, Math.max(100, Math.round(radiusRaw / 100) * 100));

  if (!Number.isFinite(latRaw) || !Number.isFinite(lngRaw)) {
    return Response.json({ error: "lat/lng required" }, { status: 400 });
  }

  try {
    const result = await fetchNearby(roundCoord(latRaw), roundCoord(lngRaw), radius);
    return Response.json({ places: result.places });
  } catch (e) {
    // 上限超過（RESOURCE_EXHAUSTED）などはユーザーに伝わる形で返す
    const status = String(e?.status || e?.message || "");
    const overQuota = status.includes("RESOURCE_EXHAUSTED") || status.includes("QUOTA");
    return Response.json(
      {
        places: [],
        error: e?.status || e?.message || "API_ERROR",
        userMessage: overQuota
          ? "現在アクセスが集中しています。時間をおいて再度お試しください"
          : "店舗情報を取得できませんでした",
      },
      { status: 200 }
    );
  }
}
