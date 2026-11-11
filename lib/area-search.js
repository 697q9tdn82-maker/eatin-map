import { AREAS } from "./areas";

// ============================================================
// 駅名・エリア名検索の「手元の一覧から答える」部分
// 掲載エリア（新宿・大手町など）の名前なら、どこにも問い合わせずに座標を返します。
// ============================================================

// 表記ゆれをならす（全角/半角・空白・末尾の「駅」「駅周辺」）
export function normPlaceName(s) {
  return (s || "").normalize("NFKC").replace(/[\s　]/g, "").replace(/(駅周辺|駅前|駅)$/, "").toLowerCase();
}

// 「梅田・大阪駅」は「梅田」「大阪」のどちらでも、「京橋（東京）」は「京橋」で引けるようにする
// （同じ名前が複数あるときは、一覧で先に出てくるほうを優先）
const AREA_INDEX = (() => {
  const idx = new Map();
  for (const a of Object.values(AREAS)) {
    for (const n of a.name.replace(/（.*?）/g, "").split("・")) {
      const k = normPlaceName(n);
      if (k && !idx.has(k)) idx.set(k, a);
    }
  }
  return idx;
})();

export function matchArea(q) {
  const a = AREA_INDEX.get(normPlaceName(q));
  return a ? { lat: a.lat, lng: a.lng, name: q, address: `${a.pref} ${a.name}`, via: "area" } : null;
}

// 「武蔵小杉」のように駅名らしい言葉か（住所・番地・区市町村名は除く）
export function looksLikeStationName(q) {
  return !/駅$/.test(q) && !/[0-9０-９]|[都道府県市区町村]$|丁目|番地/.test(q) && q.length <= 12;
}
