import { fetchNearby, snapSearch } from "../../../lib/places";

// コンビニ検索API
//
// 【コスト対策：キャッシュ】
// Nearby Searchは無料枠が限られ、超えると高額です。
// 探す地点を約200m間隔の格子点に、半径を500/1000/1500mの3段階にそろえてからキャッシュ（30日）するので、
// 「同じ駅前を別の人が検索した」場合はGoogleを呼ばずに済みます。（lib/places.js の snapSearch）

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const latRaw = parseFloat(searchParams.get("lat"));
  const lngRaw = parseFloat(searchParams.get("lng"));
  const radiusRaw = parseFloat(searchParams.get("radius") || "500") || 500;
  const radius = Math.min(1500, Math.max(100, radiusRaw));

  if (!Number.isFinite(latRaw) || !Number.isFinite(lngRaw)) {
    return Response.json({ error: "lat/lng required" }, { status: 400 });
  }

  try {
    const snap = snapSearch(latRaw, lngRaw, radius);
    const result = await fetchNearby(snap.lat, snap.lng, snap.radius);
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
