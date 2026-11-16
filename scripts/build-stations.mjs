// ============================================================
// 駅ページの自動追加リストを作るスクリプト（GitHub Actions で週1回実行）
//
// 駅から600m以内に「投稿で確認済みの店（あり／なし）が5店以上」あり、
// そのうち「人が確認した『イートインあり』が1店以上」ある駅だけを、エリアページとして自動で追加します。
// 中身の薄いページや、座れる店が1つも載っていないページを作らないためのルールです。
//
//   node scripts/build-stations.mjs           → data/stations.js を更新
//   node scripts/build-stations.mjs --dry     → 結果を表示するだけ（保存しない）
//
// 材料:
//   station_coords.js      … 駅名と位置（約1,100駅）
//   data/stores/*.json     … 店舗マスタ
//   Firestore の投稿       … 人の投稿だけを数える（AI推定・推定情報は数えない）
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHAINS, distanceMeters } from "../lib/store-core.js";
import { HANDPICKED_AREAS } from "../lib/areas.js";
import { AUTO_STATIONS as PREVIOUS } from "../data/stations.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data", "stations.js");
const DRY = process.argv.includes("--dry");

const RADIUS = 600;          // 駅から何m以内の店を数えるか（lib/area-data.js の AREA_RADIUS と同じ）
const MIN_TO_ADD = 5;        // 新しく追加する条件：人の投稿で有無が分かっている店の数
const MIN_TO_KEEP = 4;       // 一度追加した駅は、これを下回るまで残す（ページが出たり消えたりしないように）
const MIN_YES = 1;           // 人が確認した「イートインあり」の店がこれ以上あること（追加・維持どちらも必須）
const MIN_STORES = 5;        // 駅のまわりのコンビニがこれより少ない駅は対象外（郊外・位置の誤りを除く）
const NEAR_EXISTING = 500;   // 既存のエリアや、もっと確認の多い駅からこの距離以内なら重複とみなす
const MAX_STATIONS = 300;

// ---- 駅の一覧 ----
const stationSrc = fs.readFileSync(path.join(ROOT, "station_coords.js"), "utf8");
const stations = [...stationSrc.matchAll(/"([^"]+)":\s*\{\s*lat:\s*([\d.]+),\s*lng:\s*([\d.]+)/g)]
  .map(m => ({ name: m[1], lat: parseFloat(m[2]), lng: parseFloat(m[3]) }))
  .filter(s => s.lat > 24 && s.lat < 46 && s.lng > 122 && s.lng < 146);

// ---- 店舗マスタ ----
const stores = [];
for (const chain of Object.keys(CHAINS)) {
  let data;
  try { data = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "stores", `${chain}.json`), "utf8")); } catch { continue; }
  for (const [ref, name, lat, lng, addr] of data.stores) stores.push({ id: `${chain}:${ref}`, name, lat, lng, addr: addr || "" });
}
const legacy = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "legacy-place-ids.json"), "utf8"));

// ---- 人の投稿を全部読む（REST・読み取りは公開設定） ----
const PROJECT = "eatin-map-ee417";
const API_KEY = "AIzaSyB5eSZLCsrCCuUKXdmKwZyUxqlNbPBpZoI"; // lib/firebase.js と同じ公開キー
const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery?key=${API_KEY}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ structuredQuery: {
    from: [{ collectionId: "verifications" }],
    select: { fields: ["placeId", "hasEatIn", "source", "createdAt"].map(f => ({ fieldPath: f })) },
  } }),
});
if (!res.ok) {
  console.error(`投稿を読み込めませんでした（HTTP ${res.status}）。前回のリストをそのまま使います`);
  process.exit(1);
}
const rows = (await res.json()).map(r => r.document?.fields).filter(Boolean);
if (rows.length < 100) {
  console.error(`投稿が${rows.length}件しか取れませんでした。取得失敗とみなして前回のリストをそのまま使います`);
  process.exit(1);
}

// 店ごとに人の投稿で多数決 → 有無が決まった店（あり・なし）の集合
const votes = new Map();
for (const f of rows) {
  if (f.source?.stringValue === "ai") continue;
  const pid = f.placeId?.stringValue;
  const has = f.hasEatIn?.booleanValue;
  if (!pid || typeof has !== "boolean") continue;
  const id = legacy[pid] || pid;
  const at = f.createdAt?.timestampValue || "";
  const v = votes.get(id) || { yes: 0, no: 0, lastAt: "", last: null };
  has ? v.yes++ : v.no++;
  if (at >= v.lastAt) { v.lastAt = at; v.last = has; }
  votes.set(id, v);
}
// 多数決（同数なら最新の投稿）。サイトの表示と同じルール
const known = new Set(votes.keys());
const knownYes = new Set([...votes].filter(([, v]) => v.yes > v.no || (v.yes === v.no && v.last === true)).map(([id]) => id));
console.log(`投稿 ${rows.length}件（AI推定を含む）→ 人が確認した店 ${known.size}店（うち「あり」${knownYes.size}店）`);

// ---- 駅ごとに数える ----
const PREF_RE = /^(東京都|北海道|京都府|大阪府|.{2,3}県)/;
const previous = new Set(PREVIOUS.map(s => s.name));
const handpicked = Object.values(HANDPICKED_AREAS);

const candidates = [];
for (const st of stations) {
  if (handpicked.some(a => distanceMeters(a.lat, a.lng, st.lat, st.lng) < NEAR_EXISTING)) continue;
  const dLat = 0.01, dLng = 0.0125; // ざっくり絞ってから正確な距離を測る
  const near = stores.filter(s => Math.abs(s.lat - st.lat) < dLat && Math.abs(s.lng - st.lng) < dLng && distanceMeters(st.lat, st.lng, s.lat, s.lng) <= RADIUS);
  if (near.length < MIN_STORES) continue;
  const confirmed = near.filter(s => known.has(s.id)).length;
  const yes = near.filter(s => knownYes.has(s.id)).length;
  if (confirmed < (previous.has(st.name) ? MIN_TO_KEEP : MIN_TO_ADD) || yes < MIN_YES) continue;
  // 都道府県：まわりの店の住所でいちばん多いもの
  const prefCount = {};
  for (const s of near) { const m = s.addr.match(PREF_RE); if (m) prefCount[m[1]] = (prefCount[m[1]] || 0) + 1; }
  const pref = Object.entries(prefCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!pref) continue;
  candidates.push({ name: st.name, lat: st.lat, lng: st.lng, pref, confirmed, yes });
}

// 近すぎる駅どうしは、確認の多いほうだけ残す
candidates.sort((a, b) => b.confirmed - a.confirmed);
const picked = [];
for (const c of candidates) {
  if (picked.some(p => distanceMeters(p.lat, p.lng, c.lat, c.lng) < NEAR_EXISTING)) continue;
  picked.push(c);
  if (picked.length >= MAX_STATIONS) break;
}
picked.sort((a, b) => a.pref.localeCompare(b.pref, "ja") || a.name.localeCompare(b.name, "ja"));

console.log(`駅ページの対象 ${picked.length}駅（前回 ${PREVIOUS.length}駅）`);
for (const p of picked) console.log(`  ${p.pref} ${p.name}（確認済み${p.confirmed}店・うち「あり」${p.yes}店）`);
if (DRY) process.exit(0);

const body = picked.map(p => `  { name: ${JSON.stringify(p.name)}, lat: ${p.lat}, lng: ${p.lng}, pref: ${JSON.stringify(p.pref)} },`).join("\n");
fs.writeFileSync(OUT, `// 自動生成ファイル（scripts/build-stations.mjs が週1回作り直します。手で編集しないでください）
// 投稿で確認済みの店が駅から600m以内に5店以上あり、人が確認した「あり」が1店以上ある駅だけを追加します。
export const AUTO_STATIONS = [
${body}
];
`);
