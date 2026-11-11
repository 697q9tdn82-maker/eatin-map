// ============================================================
// 以前の投稿を、新しい店舗マスタに引き継ぐための「対応表」を作るスクリプト
//
// これまでの投稿は Google の店舗ID（ChIJ…）にひもづいています。
// 店舗マスタの店舗ID（例: seven:006379）との対応を調べて
// data/legacy-place-ids.json に { "Googleの店舗ID": "新しい店舗ID" } の形で保存します。
// 投稿データ（Firestore）そのものは書き換えません（読むだけ）。
//
// 照合のしかた:
//   ① 店名（チェーン＋支店名）がマスタの中で1店だけに一致 → その店
//   ② 位置が分かる店は、同じチェーンでいちばん近い店（80m以内）
// 対応表は「足すだけ」で、すでに決まった対応は変えません。
//
// 手元で試すとき:  node scripts/build-legacy-map.mjs
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHAINS, chainKeyOfName, subBrandOf, branchKeyVariants, distanceMeters } from "../lib/store-core.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const STORES_DIR = path.join(ROOT, "data", "stores");
const OUT = path.join(ROOT, "data", "legacy-place-ids.json");
// 位置つきの旧データ（あれば使う。なくても店名だけで照合する）
const OLD_SNAPSHOT = path.join(ROOT, "data", "area-stores.json");

const NAME_MAX_DIST = 400;   // 店名が一致しても、これ以上離れていたら別の店とみなす（m）
const NEAR_MAX_DIST = 80;    // 店名で決まらないとき、位置だけで同じ店とみなす距離（m）

// Firebaseの公開設定（lib/eatin-data.js と同じ。読み取り専用で、秘密の値ではない）
const RUN_QUERY_URL = "https://firestore.googleapis.com/v1/projects/eatin-map-ee417/databases/(default)/documents:runQuery?key=AIzaSyB5eSZLCsrCCuUKXdmKwZyUxqlNbPBpZoI";

export function loadMaster() {
  const stores = [];
  for (const chain of Object.keys(CHAINS)) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(STORES_DIR, `${chain}.json`), "utf8")); } catch { continue; }
    for (const r of data.stores || []) stores.push({ id: `${chain}:${r[0]}`, chain, name: r[1], lat: r[2], lng: r[3] });
  }
  return stores;
}

// 照合の本体（テストしやすいようにデータを引数で受け取る）
//   master   : [{ id, chain, name, lat, lng }]
//   targets  : [{ placeId, name, lat?, lng? }]  ← 以前の店（Googleの店舗ID）
//   existing : すでに決まっている対応 { placeId: storeId }
export function matchLegacy(master, targets, existing = {}) {
  const byName = new Map();   // "チェーン|系列|支店名" → [店舗]
  const grid = new Map();     // 位置から近くの店を引くための索引
  const cell = (lat, lng) => `${Math.floor(lat * 500)},${Math.floor(lng * 500)}`;
  for (const s of master) {
    for (const k of branchKeyVariants(s.name)) {
      if (!k) continue;
      const key = `${s.chain}|${subBrandOf(s.name)}|${k}`;
      if (!byName.has(key)) byName.set(key, []);
      if (!byName.get(key).includes(s)) byName.get(key).push(s);
    }
    const c = cell(s.lat, s.lng);
    if (!grid.has(c)) grid.set(c, []);
    grid.get(c).push(s);
  }
  const near = (lat, lng, chain, max) => {
    let best = null, bd = max;
    const y = Math.floor(lat * 500), x = Math.floor(lng * 500);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      for (const s of grid.get(`${y + dy},${x + dx}`) || []) {
        if (s.chain !== chain) continue;
        const d = distanceMeters(lat, lng, s.lat, s.lng);
        if (d <= bd) { bd = d; best = s; }
      }
    }
    return best;
  };

  const map = { ...existing };
  const stats = { already: 0, byName: 0, byPlace: 0, noChain: 0, unmatched: [] };
  for (const t of targets) {
    if (!t.placeId || t.placeId.includes(":")) continue;   // 新しい店舗IDの投稿は対象外
    if (map[t.placeId]) { stats.already++; continue; }
    const chain = chainKeyOfName(t.name);
    if (!chain) { stats.noChain++; stats.unmatched.push(t.name); continue; }
    const hasPos = Number.isFinite(t.lat) && Number.isFinite(t.lng);

    // ① 店名で照合
    let hit = null;
    for (const k of branchKeyVariants(t.name)) {
      if (!k) continue;
      let cands = byName.get(`${chain}|${subBrandOf(t.name)}|${k}`) || [];
      if (hasPos) cands = cands.filter(s => distanceMeters(t.lat, t.lng, s.lat, s.lng) <= NAME_MAX_DIST);
      if (cands.length === 1) { hit = cands[0]; break; }
    }
    if (hit) { map[t.placeId] = hit.id; stats.byName++; continue; }

    // ② 位置で照合（同じチェーンでいちばん近い店）
    if (hasPos) {
      const s = near(t.lat, t.lng, chain, NEAR_MAX_DIST);
      if (s) { map[t.placeId] = s.id; stats.byPlace++; continue; }
    }
    stats.unmatched.push(t.name);
  }
  return { map, stats };
}

async function fetchVerifiedPlaces() {
  const res = await fetch(RUN_QUERY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "verifications" }],
        select: { fields: [{ fieldPath: "placeId" }, { fieldPath: "placeName" }] },
      },
    }),
  });
  if (!res.ok) throw new Error(`Firestoreの読み取りに失敗: HTTP ${res.status}`);
  const rows = await res.json();
  const out = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    const f = r.document?.fields;
    const id = f?.placeId?.stringValue;
    if (id && !out.has(id)) out.set(id, f?.placeName?.stringValue || "");
  }
  return out;
}

async function main() {
  const master = loadMaster();
  if (master.length === 0) {
    console.log("店舗マスタがまだないので、対応表は作りませんでした（先に build-stores.mjs を実行）");
    return;
  }
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(OUT, "utf8")); } catch { /* 初回 */ }

  // 投稿のある店（店名だけ分かる）
  const verified = await fetchVerifiedPlaces();
  // 位置つきの旧データ（駅周辺の店）
  const withPos = new Map();
  try {
    const snap = JSON.parse(fs.readFileSync(OLD_SNAPSHOT, "utf8"));
    for (const a of Object.values(snap.areas || {})) {
      for (const p of a.places || []) withPos.set(p.place_id, p);
    }
  } catch { /* なくてもOK */ }

  const targets = [];
  for (const [placeId, p] of withPos) targets.push({ placeId, name: p.name, lat: p.lat, lng: p.lng });
  for (const [placeId, name] of verified) if (!withPos.has(placeId)) targets.push({ placeId, name });

  const { map, stats } = matchLegacy(master, targets, existing);

  // 投稿のある店のうち、引き継げた数
  const legacyVerified = [...verified.keys()].filter(id => !id.includes(":"));
  const carried = legacyVerified.filter(id => map[id]).length;
  const lost = legacyVerified.filter(id => !map[id]).map(id => verified.get(id));

  const sorted = Object.fromEntries(Object.entries(map).sort((a, b) => (a[0] < b[0] ? -1 : 1)));
  const text = "{\n" + Object.entries(sorted).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(",\n") + "\n}\n";
  let before = "";
  try { before = fs.readFileSync(OUT, "utf8"); } catch { /* 初回 */ }
  if (text !== before) fs.writeFileSync(OUT, text);

  const lines = [
    `対応表: ${Object.keys(sorted).length}件（今回追加 ${stats.byName + stats.byPlace}件＝店名で${stats.byName}・位置で${stats.byPlace}）`,
    `投稿のある店（以前のID）: ${legacyVerified.length}店 → 引き継ぎ ${carried}店・引き継げず ${lost.length}店`,
  ];
  console.log(lines.join("\n"));
  if (lost.length) console.log("引き継げなかった店:\n  " + lost.join("\n  "));
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `## 以前の投稿の引き継ぎ\n\n${lines.map(l => `- ${l}`).join("\n")}\n` +
      (lost.length ? `\n<details><summary>引き継げなかった店（${lost.length}）</summary>\n\n${lost.map(n => `- ${n}`).join("\n")}\n\n</details>\n` : ""));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e); process.exit(1); });
}
