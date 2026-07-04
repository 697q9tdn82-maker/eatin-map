// 駅名・エリア名のテキスト検索API
// 「新宿駅」「梅田」などの文字を座標に変換する（Google Places Text Search利用）
// これにより駅の座標データを手作業で集める必要がなくなります
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 100);
  if (!q) return Response.json({ error: "q required" }, { status: 400 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

  try {
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
        maxResultCount: 1,
      }),
    });
    const data = await res.json();
    const p = data.places?.[0];
    if (!p?.location) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({
      lat: p.location.latitude,
      lng: p.location.longitude,
      name: p.displayName?.text || q,
      address: p.formattedAddress || "",
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
