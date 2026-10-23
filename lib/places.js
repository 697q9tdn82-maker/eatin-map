import { unstable_cache } from "next/cache";

// ============================================================
// Google Places（Nearby Search）の共通部品
//
// 地図の検索API（/api/places）とエリアページの両方からこれを使います。
// 同じ場所・同じ半径の結果は30日間キャッシュを共有するので、
// 呼び出し回数（＝費用）が増えません。
//
// 【料金】取ってくる項目は「ID・店名・住所・位置」だけにしています。
// 営業時間（currentOpeningHours / regularOpeningHours）を含めると料金ランクが
// Pro → Enterprise に上がり、毎月の無料枠が約5,000回 → 約1,000回に減るため。
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

// 地図の検索用：探す地点を約200m間隔の格子点にそろえ、半径も3段階に固定する。
// 同じ駅前で探した人どうしが同じ結果（キャッシュ）を使い回せるので、
// Googleへの問い合わせ回数が大きく減る。
// 格子点は本来の地点から最大約160mずれるので、そのぶん半径を足して取りこぼしを防ぐ。
const GRID_LAT = 0.002;   // 約220m
const GRID_LNG = 0.0025;  // 約230m（日本の緯度）
const RADIUS_STEPS = [500, 1000, 1500];
export function snapSearch(lat, lng, radius) {
  const sLat = Math.round(lat / GRID_LAT) * GRID_LAT;
  const sLng = Math.round(lng / GRID_LNG) * GRID_LNG;
  const need = radius + 160;
  const r = RADIUS_STEPS.find(x => x >= need) || RADIUS_STEPS[RADIUS_STEPS.length - 1];
  return { lat: Number(sLat.toFixed(4)), lng: Number(sLng.toFixed(4)), radius: r };
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
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({
        includedTypes: ["convenience_store"],
        locationRestriction: {
          circle: { center: { latitude: lat, longitude: lng }, radius },
        },
        // 一度に最大20件しか返らないので、人気順ではなく「近い順」で取る（店が多い駅前で近くの店が漏れないように）
        rankPreference: "DISTANCE",
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
      })),
    };
  },
  ["places-nearby-v3"],
  { revalidate: CACHE_DAYS * 24 * 60 * 60 }
);
