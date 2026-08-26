import { unstable_cache } from "next/cache";

// 駅名・エリア名のテキスト検索API
// 「新宿駅」「梅田」などの文字を座標に変換します。
//
// 【コスト対策】
// ① 安いGeocoding API（無料枠 月10,000回 / $5per1000）を先に使う
//    ※ Text Searchは無料枠5,000回・$32per1000と高いので最後の手段
// ② 検索結果を30日間キャッシュ（「新宿駅」は何人が検索しても1回で済む）

const CACHE_DAYS = 30;
const KEY = () => process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

// ① Geocoding APIで座標を取得（安い・駅名や地名が得意）
async function geocode(q, apiKey) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&language=ja&region=jp&key=${apiKey}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  if (data.status !== "OK" || !data.results?.length) return null;

  const r = data.results[0];
  const loc = r.geometry?.location;
  if (!loc) return null;

  // 「日本」「東京都」など広すぎる結果は地図が引きすぎるので採用しない
  const tooBroad = ["country", "administrative_area_level_1", "political"];
  const types = r.types || [];
  if (types.some(t => tooBroad.includes(t)) && !types.includes("locality") && !types.includes("transit_station")) {
    return null;
  }

  return { lat: loc.lat, lng: loc.lng, name: q, address: r.formatted_address || "", via: "geocoding" };
}

// ② 見つからなければ Places Text Search（高いが施設名に強い）
async function textSearch(q, apiKey) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.location,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify({ textQuery: q, languageCode: "ja", regionCode: "JP", pageSize: 1 }),
    cache: "no-store",
  });
  const data = await res.json();
  const p = data.places?.[0];
  if (!p?.location) return null;
  return {
    lat: p.location.latitude,
    lng: p.location.longitude,
    name: p.displayName?.text || q,
    address: p.formattedAddress || "",
    via: "textsearch",
  };
}

// 地名 → 座標の変換結果をキャッシュする（同じ駅名は1回だけ問い合わせる）
const lookupPlace = unstable_cache(
  async (q) => {
    const apiKey = KEY();
    if (!apiKey) return { error: "api key missing" };

    // 駅名は「〜駅」を明示した方がGeocodingの精度が上がる
    const candidates = /駅$/.test(q) ? [q, `${q} 日本`] : [q];
    for (const c of candidates) {
      const hit = await geocode(c, apiKey);
      if (hit) return hit;
    }

    // Geocodingで見つからない場合のみ、高いAPIを使う
    const fallback = await textSearch(q, apiKey);
    if (fallback) return fallback;

    return { error: "not found" };
  },
  ["place-lookup"],
  { revalidate: CACHE_DAYS * 24 * 60 * 60 }
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  // 表記ゆれでキャッシュが分かれないように、前後の空白を除き小文字化して扱う
  const q = (searchParams.get("q") || "").trim().slice(0, 100);
  if (!q) return Response.json({ error: "q required" }, { status: 400 });

  try {
    const hit = await lookupPlace(q);
    if (hit.error) {
      return Response.json({ error: hit.error, userMessage: "場所が見つかりませんでした" }, { status: 404 });
    }
    return Response.json(hit);
  } catch (e) {
    return Response.json({ error: e.message, userMessage: "検索に失敗しました" }, { status: 500 });
  }
}
