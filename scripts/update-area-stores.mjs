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
// ・Googleは1回の検索で最大20店しか返さないため、店が多い駅は
//   駅の中心＋まわり6か所に分けて取り、重複を除いてまとめる
// ・1日の上限を使い切らないよう、1回の実行で呼ぶのは最大 MAX_CALLS 回まで。
//   古いエリアから順に更新し、REFRESH_DAYS 日以内に更新済みのエリアは飛ばす
// ・GitHub Actions が毎日自動で実行します（.github/workflows/update-area-stores.yml）
// ・取得に失敗したエリアは、前回の内容をそのまま残します
//
// 手元で試すとき:
//   node scripts/update-area-stores.mjs              → 古いエリアから順に
//   node scripts/update-area-stores.mjs shinjuku     → 指定エリアだけ（日数に関係なく更新）
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AREAS } from "../lib/areas.js";

const SITE_URL = process.env.SITE_URL || "https://www.eatin-map.jp";
const MAX_CALLS = Number(process.env.MAX_CALLS || 50); // 1回の実行で呼ぶ最大回数
const REFRESH_DAYS = Number(process.env.REFRESH_DAYS || 14); // この日数以内に更新したエリアは飛ばす
const AREA_RADIUS = 600;    // lib/area-data.js の AREA_RADIUS と同じ（駅から徒歩7〜8分）
const CENTER_ASK = 440;     // 中心の検索：/api/places 側で半径1000mにそろえられる
const RING_ASK = 300;       // まわりの検索：/api/places 側で半径500mにそろえられる
const RING_DIST = 380;      // まわりの6か所は駅から約380mの位置
const SPLIT_THRESHOLD = 15; // 中心の検索で600m以内に15店以上あれば「取りこぼしあり」とみなして分割
const CALLS_PER_SPLIT = 7;  // 分割すると中心＋6か所＝7回
const WAIT_MS = 1200;       // 本番サイトに負荷をかけないよう、1回ごとに少し待つ
const FORMAT_VERSION = 2;   // 取得方法を変えたら上げる（古い方法で取ったエリアを優先して取り直す）

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "data", "area-stores.json");

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 駅からdistメートル・角度degの地点
function offsetPoint(lat, lng, dist, deg) {
  const rad = deg * Math.PI / 180;
  const dLat = (dist * Math.cos(rad)) / 111320;
  const dLng = (dist * Math.sin(rad)) / (111320 * Math.cos(lat * Math.PI / 180));
  return { lat: Number((lat + dLat).toFixed(5)), lng: Number((lng + dLng).toFixed(5)) };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function load() {
  try { return JSON.parse(fs.readFileSync(OUT, "utf8")); } catch { return { updatedAt: null, areas: {} }; }
}

class QuotaError extends Error {}

let calls = 0;
async function search(lat, lng, radius) {
  calls++;
  const url = `${SITE_URL}/api/places?lat=${lat}&lng=${lng}&radius=${radius}`;
  const res = await fetch(url, { headers: { "User-Agent": "eatin-map-snapshot-bot" } });
  await sleep(WAIT_MS);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) {
    const msg = String(data.error);
    if (/RESOURCE_EXHAUSTED|QUOTA/i.test(msg)) throw new QuotaError(msg);
    throw new Error(msg);
  }
  return (data.places || []).filter(p => p.place_id && Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

// 1エリア分を取得。店が多ければ分割して取り、600m以内の店を駅に近い順で返す
async function fetchArea(area) {
  const found = new Map();
  const add = list => list.forEach(p => found.set(p.place_id, p));
  const within = () => [...found.values()].filter(p => distanceMeters(area.lat, area.lng, p.lat, p.lng) <= AREA_RADIUS);

  add(await search(area.lat, area.lng, CENTER_ASK));
  let split = false;
  if (within().length >= SPLIT_THRESHOLD) {
    split = true;
    for (let deg = 0; deg < 360; deg += 60) {
      const pt = offsetPoint(area.lat, area.lng, RING_DIST, deg);
      add(await search(pt.lat, pt.lng, RING_ASK));
    }
  }
  const places = within()
    .map(p => ({ ...p, _d: distanceMeters(area.lat, area.lng, p.lat, p.lng) }))
    .sort((a, b) => a._d - b._d)
    .map(({ place_id, name, address, lat, lng }) => ({ place_id, name, address, lat, lng }));
  return { places, split };
}

async function main() {
  const only = process.argv.slice(2).filter(s => AREAS[s]);
  const snap = load();
  snap.areas ||= {};

  // 対象：指定があればそれだけ。なければ「未取得」「古い」エリアを古い順に
  const now = Date.now();
  const age = slug => {
    const t = Date.parse(snap.areas[slug]?.fetchedAt || "");
    return Number.isFinite(t) ? now - t : Infinity;
  };
  const targets = only.length > 0
    ? only
    : Object.keys(AREAS)
        .filter(slug => age(slug) > REFRESH_DAYS * 86400000 || snap.areas[slug]?.v !== FORMAT_VERSION)
        .sort((a, b) => age(b) - age(a));
  // ↑ 分割取得の導入前に作ったエリア（v が古い）も対象にして取り直す

  let ok = 0, failed = 0;
  for (const slug of targets) {
    // 分割すると7回かかるので、残りの回数が足りなければ今日はここまで
    if (only.length === 0 && MAX_CALLS - calls < CALLS_PER_SPLIT) {
      console.log(`今日の上限（${MAX_CALLS}回）に近いので、残りは次回に回します`);
      break;
    }
    try {
      const { places, split } = await fetchArea(AREAS[slug]);
      // 0店が返ってきたのに前回は店があった＝一時的な不具合の可能性が高いので、上書きしない
      if (places.length === 0 && snap.areas[slug]?.places?.length > 0) {
        throw new Error("0店が返ってきたため");
      }
      snap.areas[slug] = { v: FORMAT_VERSION, fetchedAt: new Date().toISOString(), split, places };
      ok++;
      console.log(`✔ ${slug}: ${places.length}店${split ? "（分割取得）" : ""}`);
    } catch (e) {
      failed++;
      console.log(`✖ ${slug}: ${e.message}（前回の内容を残します）`);
      if (e instanceof QuotaError) {
        console.log("Google側の1日の上限に達しているため、ここで終了します");
        break;
      }
    }
  }

  // 今はもう存在しないエリアのデータは消す
  for (const slug of Object.keys(snap.areas)) if (!AREAS[slug]) delete snap.areas[slug];

  if (ok > 0) {
    snap.updatedAt = new Date().toISOString();
    // キーの順番をそろえて、差分が見やすいファイルにする
    const sorted = { updatedAt: snap.updatedAt, areas: Object.fromEntries(Object.keys(snap.areas).sort().map(k => [k, snap.areas[k]])) };
    fs.writeFileSync(OUT, JSON.stringify(sorted, null, 1) + "\n");
  }
  const left = Object.keys(AREAS).filter(s => snap.areas[s]?.v !== FORMAT_VERSION).length;
  if (left > 0) console.log(`新しい方法でまだ取得していないエリア：残り${left}`);
  console.log(`\n完了：成功 ${ok} / 失敗 ${failed}（呼び出し ${calls}回）`);
  if (ok === 0 && failed > 0) process.exit(1);
}

main();
