// 駅名・エリア名のテキスト検索API
// 「新宿駅」「梅田」などの文字を座標に変換します。
//
// 【コスト対策】
// このアプリが必要なのは「座標」だけなので、まず安いGeocoding APIで探します。
//   Geocoding    … 無料枠 月10,000回 / 超過 $5 per 1000
//   Text Search  … 無料枠 月 5,000回 / 超過 $32 per 1000
// 駅名・地名・住所はGeocodingの方が本来の用途で精度も高く、
// 施設名（例：東京タワー）など苦手なものだけText Searchに切り替えます。
// これで大半の検索が1/6の単価・2倍の無料枠で処理できます。

const KEY = () => process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

// ① Geocoding APIで座標を取得（安い・駅名や地名が得意）
async function geocode(q, apiKey) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&language=ja&region=jp&key=${apiKey}`;
  const res = await fetch(url);
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

  return {
    lat: loc.lat,
    lng: loc.lng,
    name: q,
    address: r.formatted_address || "",
    via: "geocoding",
  };
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
    body: JSON.stringify({
      textQuery: q,
      languageCode: "ja",
      regionCode: "JP",
      pageSize: 1,
    }),
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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 100);
  if (!q) return Response.json({ error: "q required" }, { status: 400 });

  const apiKey = KEY();
  if (!apiKey) return Response.json({ error: "api key missing" }, { status: 500 });

  try {
    // 駅名は「〜駅」を明示した方がGeocodingの精度が上がる
    const candidates = /駅$/.test(q) ? [q, `${q} 日本`] : [q];

    for (const c of candidates) {
      const hit = await geocode(c, apiKey);
      if (hit) return Response.json(hit);
    }

    // Geocodingで見つからない場合のみ、高いAPIを使う
    const fallback = await textSearch(q, apiKey);
    if (fallback) return Response.json(fallback);

    return Response.json({ error: "not found" }, { status: 404 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
