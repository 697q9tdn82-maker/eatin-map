import { unstable_cache } from "next/cache";
import { matchArea, looksLikeStationName } from "../../../lib/area-search";

// 駅名・エリア名のテキスト検索API
// 「新宿駅」「梅田」などの文字を座標に変換します。
//
// 【コスト対策】
// ① 掲載エリア（新宿・大手町など）の名前なら、手元の一覧から答える（どこにも問い合わせない）
// ② それ以外は Geocoding API（無料枠 月10,000回）で調べ、結果を30日間キャッシュ
//    （「武蔵小杉駅」は何人が検索しても1回で済む）
// ※ 以前は見つからないときに Places API（Text Search）も使っていましたが、やめました。
//    これでサイト全体から Places API の呼び出しがなくなっています。

const CACHE_DAYS = 30;
const KEY = () => process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

// ② Geocoding APIで座標を取得
//   stationOnly: 駅として見つかったときだけ採用する（「○○駅」を勝手に補って探すとき用）
async function geocode(q, apiKey, stationOnly = false) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&language=ja&region=jp&key=${apiKey}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  // 上限超過・キーの問題などは「見つからない」と区別して例外にする（＝キャッシュに残さない）
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`GEOCODING_${data.status || res.status}`);
  }
  if (!data.results?.length) return null;

  const r = data.results[0];
  const loc = r.geometry?.location;
  if (!loc) return null;

  const types = r.types || [];
  // 「日本」「東京都」など広すぎる結果は地図が引きすぎるので採用しない
  if (types.includes("country") || types.includes("administrative_area_level_1")) return null;
  if (stationOnly) {
    const isStation = types.some(t => ["transit_station", "train_station", "subway_station", "light_rail_station"].includes(t));
    if (!isStation || r.partial_match) return null;
  }

  return { lat: loc.lat, lng: loc.lng, address: r.formatted_address || "", via: "geocoding" };
}

// 地名 → 座標の変換結果をキャッシュする（同じ駅名は1回だけ問い合わせる）
const lookupPlace = unstable_cache(
  async (q) => {
    const apiKey = KEY();
    if (!apiKey) return { error: "api key missing" };

    // 「武蔵小杉」のような駅名らしい言葉は、先に「武蔵小杉駅」で探す（町の真ん中ではなく駅に合わせるため）
    if (looksLikeStationName(q)) {
      const st = await geocode(`${q}駅`, apiKey, true);
      if (st) return { ...st, name: q };
    }
    const hit = await geocode(q, apiKey);
    if (hit) return { ...hit, name: q };
    return { error: "not found" };
  },
  ["place-lookup-v2"],
  { revalidate: CACHE_DAYS * 24 * 60 * 60 }
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 100);
  if (!q) return Response.json({ error: "q required" }, { status: 400 });

  const area = matchArea(q);
  if (area) return Response.json(area);

  try {
    const hit = await lookupPlace(q);
    if (hit.error) {
      return Response.json({ error: hit.error, userMessage: "場所が見つかりませんでした。駅名やエリア名で試してください" }, { status: 404 });
    }
    return Response.json(hit);
  } catch (e) {
    return Response.json({ error: e.message, userMessage: "検索に失敗しました。時間をおいて再度お試しください" }, { status: 500 });
  }
}
