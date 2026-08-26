import { unstable_cache } from "next/cache";

// コンビニ検索API
//
// 【コスト対策：キャッシュ】
// Nearby Searchは無料枠が月5,000回（1日約165回）しかなく、
// 超えると$32/1000回と高額です。
// そこで座標を約100m単位に丸めてからキャッシュすることで、
// 「同じ駅を別の人が検索した」場合にGoogleを呼ばずに済むようにしています。
// 人気エリアほど効果が大きく、呼び出し回数を大幅に減らせます。

const CACHE_DAYS = 30;

// 座標を約100m単位に丸める（小数第3位）
// これをしないとGPSの座標が1人ずつ違い、キャッシュがまったく効かない
function roundCoord(v) {
  return Math.round(v * 1000) / 1000;
}

// Googleに問い合わせる処理（この結果がキャッシュされる）
const fetchNearby = unstable_cache(
  async (lat, lng, radius) => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.currentOpeningHours,places.regularOpeningHours",
      },
      body: JSON.stringify({
        includedTypes: ["convenience_store"],
        locationRestriction: {
          circle: { center: { latitude: lat, longitude: lng }, radius },
        },
        languageCode: "ja",
        regionCode: "JP",
        maxResultCount: 20,
      }),
      cache: "no-store",
    });

    const data = await res.json();

    // APIの上限超過やキー不正のときは、その旨を返す（キャッシュに残さない）
    if (data.error) {
      return { error: data.error.status || "API_ERROR", message: data.error.message || "" };
    }

    return {
      places: (data.places || []).map(p => ({
        place_id: p.id,
        name: p.displayName?.text || "",
        address: p.formattedAddress || "",
        lat: p.location?.latitude,
        lng: p.location?.longitude,
        isOpenNow: p.currentOpeningHours?.openNow ?? null,
        openingHours: p.regularOpeningHours?.weekdayDescriptions || [],
      })),
    };
  },
  ["places-nearby"],
  { revalidate: CACHE_DAYS * 24 * 60 * 60 }
);

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

    // 上限超過（RESOURCE_EXHAUSTED）などはユーザーに伝わる形で返す
    if (result.error) {
      const overQuota = String(result.error).includes("RESOURCE_EXHAUSTED") || String(result.error).includes("QUOTA");
      return Response.json(
        {
          places: [],
          error: result.error,
          userMessage: overQuota
            ? "現在アクセスが集中しています。時間をおいて再度お試しください"
            : "店舗情報を取得できませんでした",
        },
        { status: 200 }
      );
    }

    return Response.json({ places: result.places });
  } catch (e) {
    return Response.json({ places: [], error: e.message, userMessage: "店舗情報を取得できませんでした" }, { status: 200 });
  }
}
