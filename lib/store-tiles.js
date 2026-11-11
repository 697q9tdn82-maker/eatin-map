import { tileKeysAround, rowToStore, distanceMeters } from "./store-core";

// ============================================================
// 地図用：近くのコンビニを店舗マスタから読み込む（ブラウザ側）
//
// 店舗マスタは約5km四方ごとのファイル（/stores/<タイル>.json）に分かれていて、
// 地図に映っている範囲のファイルだけを読み込みます。
// ただのファイルなので、何回読んでも料金はかからず、1日の上限もありません。
// ============================================================

let metaPromise = null;          // どのタイルがあるかの一覧（最初に1回だけ読む）
const tileCache = new Map();     // タイル → 読み込み結果（同じ場所は2回読まない）

function loadMeta() {
  if (!metaPromise) {
    metaPromise = fetch("/stores/meta.json")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(m => ({ total: m.total || 0, tiles: new Set(m.tiles || []) }))
      .catch(e => { metaPromise = null; throw e; }); // 失敗したら次回もう一度試す
  }
  return metaPromise;
}

function loadTile(key) {
  if (!tileCache.has(key)) {
    tileCache.set(key, fetch(`/stores/${key}.json`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(rows => rows.map(rowToStore))
      .catch(e => { tileCache.delete(key); throw e; }));
  }
  return tileCache.get(key);
}

// 中心(lat,lng)から半径radius(m)以内の店舗を、近い順に最大max件返す
export async function storesNear(lat, lng, radius, max = 80) {
  const meta = await loadMeta();
  const keys = tileKeysAround(lat, lng, radius).filter(k => meta.tiles.has(k)); // 店がない区画（海・山）は読まない
  const lists = await Promise.all(keys.map(loadTile));
  const found = [];
  for (const list of lists) {
    for (const s of list) {
      const d = distanceMeters(lat, lng, s.lat, s.lng);
      if (d <= radius) found.push({ s, d });
    }
  }
  found.sort((a, b) => a.d - b.d);
  return found.slice(0, max).map(x => x.s);
}
