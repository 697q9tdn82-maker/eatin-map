import { AREAS } from "./areas";
import { fetchNearby, roundCoord } from "./places";
import { fetchVerificationsByPlaceIds, summarizeStore, chainOf } from "./eatin-data";
// 店舗リストの作り置き（scripts/update-area-stores.mjs が月2回自動で更新）
import SNAPSHOT from "../data/area-stores.json";

// ============================================================
// エリアページ用のデータ組み立て（サーバー側専用）
// ============================================================

export const AREA_RADIUS = 600; // 半径600m＝駅から徒歩7〜8分

// イートイン有無が分かっている店がこの数未満のエリアは、検索結果に出さない（noindex）。
// 中身の薄いページが大量にあると、サイト全体が「低品質」と判定されやすいため。
// 投稿が増えて基準を超えると、自動的に検索対象に戻ります。
export const MIN_KNOWN_STORES = 3;

export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 表示用の駅名（「梅田・大阪駅」「東京駅周辺」などに「駅」が二重に付かないようにする）
// 例: 新宿→新宿駅 / 東京駅周辺→東京駅 / 梅田・大阪駅→そのまま / 京橋（東京）→京橋駅（東京）
export function stationName(area) {
  const n = area.name.replace(/駅周辺$/, "駅");
  const m = n.match(/^(.*?)(（.*）)$/);
  if (m) return (m[1].endsWith("駅") ? m[1] : m[1] + "駅") + m[2];
  return n.endsWith("駅") ? n : n + "駅";
}

// 近いエリアを返す（他エリアへのリンク用）
export function nearbyAreas(slug, n = 8) {
  const me = AREAS[slug];
  if (!me) return [];
  return Object.entries(AREAS)
    .filter(([s]) => s !== slug)
    .map(([s, a]) => ({ slug: s, ...a, dist: distanceMeters(me.lat, me.lng, a.lat, a.lng) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, n);
}

export async function getAreaData(slug) {
  const area = AREAS[slug];
  if (!area) return null;

  let rawStores = [];
  let fetchOk = true;
  // ① 作り置きの店舗リストがあればそれを使う（Googleを呼ばない＝0円・上限の影響なし）
  // ② なければ従来どおりその場でGoogleに問い合わせる
  const snap = SNAPSHOT?.areas?.[slug];
  const fromSnapshot = Array.isArray(snap?.places) && snap.places.length > 0;
  if (fromSnapshot) {
    rawStores = snap.places;
  } else {
    try {
      const r = await fetchNearby(roundCoord(area.lat), roundCoord(area.lng), AREA_RADIUS);
      rawStores = r.places || [];
    } catch {
      fetchOk = false; // 取得失敗時は一覧なしで表示し、noindexにする
    }
  }

  const versByPlace = rawStores.length > 0
    ? await fetchVerificationsByPlaceIds(rawStores.map(s => s.place_id))
    : {};

  const stores = rawStores.map(s => ({
    placeId: s.place_id,
    name: s.name,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    chain: chainOf(s.name),
    dist: s.lat && s.lng ? Math.round(distanceMeters(area.lat, area.lng, s.lat, s.lng) / 10) * 10 : null,
    ...summarizeStore(versByPlace[s.place_id] || []),
  }));

  // 並び順: イートインあり（人の確認→AI推定）→ 未確認 → なし。同じグループ内は駅に近い順
  const rank = s => (s.hasEatIn === true ? (s.aiOnly ? 1 : 0) : s.hasEatIn === null ? 2 : 3);
  stores.sort((a, b) => rank(a) - rank(b) || (a.dist ?? 9999) - (b.dist ?? 9999));

  const yes = stores.filter(s => s.hasEatIn === true);
  const no = stores.filter(s => s.hasEatIn === false);
  const unknown = stores.filter(s => s.hasEatIn === null);

  // イートインありの店のチェーン内訳
  const chainCounts = {};
  for (const s of yes) chainCounts[s.chain] = (chainCounts[s.chain] || 0) + 1;

  const lastPostedAt = stores
    .map(s => s.lastPostedAt)
    .filter(Boolean)
    .sort()
    .pop() || null;

  return {
    area,
    fetchOk,
    // 地図にそのまま渡す店舗リスト（作り置きがあるときだけ。地図側でもGoogleを呼ばずに済む）
    mapStores: fromSnapshot ? rawStores : null,
    stores,
    yes,
    no,
    unknown,
    humanConfirmedYes: yes.filter(s => !s.aiOnly),
    chainCounts,
    withOutlet: stores.filter(s => s.outlet && s.hasEatIn === true),
    withSeats: stores.filter(s => s.seats != null && s.hasEatIn === true),
    lastPostedAt,
    indexable: fetchOk && yes.length + no.length >= MIN_KNOWN_STORES,
  };
}
