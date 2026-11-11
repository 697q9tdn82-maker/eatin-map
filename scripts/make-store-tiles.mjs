// ============================================================
// 店舗マスタ（data/stores/*.json）から、サイトが実際に読むファイルを作るスクリプト
//
// `npm run build` と `npm run dev` の最初に自動で実行されます（手で動かす必要はありません）。
//
// 作るもの（どちらも自動生成なのでGitには入れません）:
//   public/stores/<タイル>.json   … 地図用。約5km四方ごとに分けた店舗一覧
//   public/stores/meta.json       … どのタイルがあるか・全部で何店か
//   data/generated/area-stores.json … エリアページ用。各駅から600m以内の店舗一覧
//   data/generated/store-summary.json … 全国の店舗数（トップページの「全国○店のうち…」に使う）
//   data/generated/official-eatin-ids.json … 公式サイトに「イートインあり」と出ている店のID（掲載店舗数に数える）
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHAINS, tileKey, distanceMeters } from "../lib/store-core.js";
import { AREAS } from "../lib/areas.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const STORES_DIR = path.join(ROOT, "data", "stores");
const LEGACY_FILE = path.join(ROOT, "data", "legacy-place-ids.json");
const TILE_DIR = path.join(ROOT, "public", "stores");
const GEN_DIR = path.join(ROOT, "data", "generated");
const AREA_RADIUS = 600; // lib/area-data.js の AREA_RADIUS と同じ

// 以前の店舗ID（Google）→ 新しい店舗ID の対応表を、逆向き（新 → [旧…]）にして持つ
let legacy = {};
try { legacy = JSON.parse(fs.readFileSync(LEGACY_FILE, "utf8")); } catch { /* なくてもOK */ }
const legacyByStore = new Map();
for (const [placeId, storeId] of Object.entries(legacy)) {
  if (!legacyByStore.has(storeId)) legacyByStore.set(storeId, []);
  legacyByStore.get(storeId).push(placeId);
}

const tiles = new Map();
const counts = {};
const all = [];
for (const chain of Object.keys(CHAINS)) {
  let data;
  try { data = JSON.parse(fs.readFileSync(path.join(STORES_DIR, `${chain}.json`), "utf8")); } catch { continue; }
  counts[chain] = data.stores.length;
  for (const [ref, name, lat, lng, addr, official] of data.stores) {
    const id = `${chain}:${ref}`;
    const old = legacyByStore.get(id);
    const row = [id, name, lat, lng, addr, old ? old.join(",") : 0];
    if (official === 1) row.push(1); // 公式サイトに「イートインあり」と出ている店だけ印を付ける
    const key = tileKey(lat, lng);
    if (!tiles.has(key)) tiles.set(key, []);
    tiles.get(key).push(row);
    all.push(row);
  }
}

// ---- 地図用タイル ----
fs.rmSync(TILE_DIR, { recursive: true, force: true });
fs.mkdirSync(TILE_DIR, { recursive: true });
for (const [key, rows] of tiles) {
  fs.writeFileSync(path.join(TILE_DIR, `${key}.json`), JSON.stringify(rows));
}
fs.writeFileSync(path.join(TILE_DIR, "meta.json"), JSON.stringify({
  total: all.length,
  counts,
  tiles: [...tiles.keys()].sort(),
}));

// ---- エリアページ用（各駅から600m以内） ----
const areas = {};
for (const [slug, a] of Object.entries(AREAS)) {
  const dLat = 0.01, dLng = 0.0125; // ざっくり絞ってから正確な距離を測る
  areas[slug] = all
    .filter(r => Math.abs(r[2] - a.lat) < dLat && Math.abs(r[3] - a.lng) < dLng && distanceMeters(a.lat, a.lng, r[2], r[3]) <= AREA_RADIUS)
    .map(r => ({ place_id: r[0], name: r[1], lat: r[2], lng: r[3], address: r[4], legacy_ids: r[5] ? r[5].split(",") : [], official_eatin: r[6] === 1 }));
}
fs.mkdirSync(GEN_DIR, { recursive: true });
fs.writeFileSync(path.join(GEN_DIR, "area-stores.json"), JSON.stringify({ total: all.length, areas }));
fs.writeFileSync(path.join(GEN_DIR, "official-eatin-ids.json"), JSON.stringify(all.filter(r => r[6] === 1).map(r => r[0])));
// 画面に出す「全国○店」の母数（トップページで使う）
fs.writeFileSync(path.join(GEN_DIR, "store-summary.json"), JSON.stringify({ total: all.length, counts, officialEatIn: all.filter(r => r[6] === 1).length }));

console.log(`店舗マスタ: ${all.length}店 → タイル${tiles.size}個、エリア${Object.keys(areas).length}か所ぶんを作成`);
if (all.length === 0) console.warn("⚠️ data/stores にデータがありません（地図に店が出ません）。node scripts/build-stores.mjs を実行してください");
