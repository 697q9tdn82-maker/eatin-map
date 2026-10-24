// ============================================================
// エリアページ用「店舗リストの作り置き」を更新するスクリプト
//
// 各エリア（駅）の周辺にあるコンビニの一覧を取ってきて、
// data/area-stores.json に保存します。
// エリアページはこのファイルを読むので、ページを開くたびに
// Google Places API を呼ばなくて済みます（＝料金・上限の心配なし）。
//
// ・取得は本番サイトの /api/places 経由（サーバー側のキャッシュを共有するので、
//   Googleへの問い合わせは最小限。APIキーもここでは不要）
// ・GitHub Actions が月2回（1日・15日）自動で実行します（.github/workflows/update-area-stores.yml）
// ・取得に失敗したエリアは、前回の内容をそのまま残します
//
// 手元で試すとき:
//   node scripts/update-area-stores.mjs              → 全エリア
//   node scripts/update-area-stores.mjs shinjuku     → 指定エリアだけ
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AREAS } from "../lib/areas.js";

const SITE_URL = process.env.SITE_URL || "https://www.eatin-map.jp";
const AREA_RADIUS = 600;   // lib/area-data.js の AREA_RADIUS と同じ（駅から徒歩7〜8分）
const ASK_RADIUS = 440;    // /api/places 側で「半径1000mの格子検索」にそろえられる値
const WAIT_MS = 1500;      // 本番サイトに負荷をかけないよう、1エリアごとに少し待つ

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "data", "area-stores.json");

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function load() {
  try { return JSON.parse(fs.readFileSync(OUT, "utf8")); } catch { return { updatedAt: null, areas: {} }; }
}

async function fetchArea(area) {
  const url = `${SITE_URL}/api/places?lat=${area.lat}&lng=${area.lng}&radius=${ASK_RADIUS}`;
  const res = await fetch(url, { headers: { "User-Agent": "eatin-map-snapshot-bot" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(String(data.error));
  return (data.places || [])
    .filter(p => p.place_id && Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .map(p => ({ ...p, _d: distanceMeters(area.lat, area.lng, p.lat, p.lng) }))
    .filter(p => p._d <= AREA_RADIUS)
    .sort((a, b) => a._d - b._d)
    .map(({ place_id, name, address, lat, lng }) => ({ place_id, name, address, lat, lng }));
}

async function main() {
  const only = process.argv.slice(2);
  const slugs = only.length > 0 ? only.filter(s => AREAS[s]) : Object.keys(AREAS);
  const snap = load();
  snap.areas ||= {};

  let ok = 0, failed = 0;
  for (const slug of slugs) {
    try {
      const places = await fetchArea(AREAS[slug]);
      snap.areas[slug] = { fetchedAt: new Date().toISOString(), places };
      ok++;
      console.log(`✔ ${slug}: ${places.length}店`);
    } catch (e) {
      failed++;
      console.log(`✖ ${slug}: ${e.message}（前回の内容を残します）`);
      // 上限超過なら、残りを続けても失敗するだけなので打ち切る
      if (/RESOURCE_EXHAUSTED|QUOTA/i.test(e.message)) {
        console.log("Google側の1日の上限に達しているため、ここで終了します");
        break;
      }
    }
    await sleep(WAIT_MS);
  }

  // 今はもう存在しないエリアのデータは消す
  for (const slug of Object.keys(snap.areas)) if (!AREAS[slug]) delete snap.areas[slug];

  if (ok > 0) {
    snap.updatedAt = new Date().toISOString();
    // キーの順番をそろえて、差分が見やすいファイルにする
    const sorted = { updatedAt: snap.updatedAt, areas: Object.fromEntries(Object.keys(snap.areas).sort().map(k => [k, snap.areas[k]])) };
    fs.writeFileSync(OUT, JSON.stringify(sorted, null, 1) + "\n");
  }
  console.log(`\n完了：成功 ${ok} / 失敗 ${failed}`);
  if (ok === 0 && failed > 0) process.exit(1);
}

main();
