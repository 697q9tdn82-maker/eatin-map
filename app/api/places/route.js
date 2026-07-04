export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  // 検索半径は100〜2000mの範囲に制限（不正な値や高額請求を防ぐ）
  const radius = Math.min(2000, Math.max(100, parseFloat(searchParams.get("radius") || "500") || 500));
  // サーバー専用キー（GOOGLE_PLACES_API_KEY）を優先。なければ従来のキーを使う
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

  if (!lat || !lng) return Response.json({ error: "lat/lng required" }, { status: 400 });

  try {
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
          circle: {
            center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
            radius,
          },
        },
        languageCode: "ja",
        maxResultCount: 20,
      }),
    });
    const data = await res.json();
    const places = (data.places || []).map(p => ({
      place_id: p.id,
      name: p.displayName?.text || "",
      address: p.formattedAddress || "",
      lat: p.location?.latitude,
      lng: p.location?.longitude,
      isOpenNow: p.currentOpeningHours?.openNow ?? null,
      openingHours: p.regularOpeningHours?.weekdayDescriptions || [],
    }));
    return Response.json({ places });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
