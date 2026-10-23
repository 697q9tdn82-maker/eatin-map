import { unstable_cache } from "next/cache";

// ============================================================
// Google Places（Nearby Search）の共通部品
//
// 地図の検索API（/api/places）とエリアページの両方からこれを使います。
// 同じ場所・同じ半径の結果は30日間キャッシュを共有するので、
// 呼び出し回数（＝費用）が増えません。
//
// 【重要】Googleがエラーを返したときは例外を投げます。
// こうするとエラー結果がキャッシュに残らず、次のアクセスで再挑戦されます。
// （以前はエラー結果がキャッシュされ、エリアページの店舗一覧が
//   空のまま何日も出続けていました）
// ============================================================

const CACHE_DAYS = 30;

export class PlacesApiError extends Error {
  constructor(status, message) {
    super(message || status);
    this.status = status;
  }
}

// 座標を約100m単位に丸める（小数第3位）。GPSの座標は人ごとに微妙に違うので、
// 丸めないとキャッシュがまったく効かない
export function roundCoord(v) {
  return Math.round(v * 1000) / 1000;
}

export const fetchNearby = unstable_cache(
  async (lat, lng, radius) => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) throw new PlacesApiError("NO_API_KEY", "Places APIキーが設定されていません");

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

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      // 例外にする＝キャッシュに残さない
      throw new PlacesApiError(data.error?.status || `HTTP_${res.status}`, data.error?.message || "");
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
  ["places-nearby-v2"],
  { revalidate: CACHE_DAYS * 24 * 60 * 60 }
);
