// ============================================================
// 店舗マスタ（全国のコンビニの店名・住所・位置）を作るスクリプト
//
// コンビニ各社の公式の店舗検索をもとにしたオープンデータ
// 「All The Places」（https://www.alltheplaces.xyz/ ・CC0）から、
// チェーンごとの店舗一覧を取ってきて data/stores/<チェーン>.json に保存します。
//
// ・GitHub Actions が週1回、自動で実行します（.github/workflows/update-stores.yml）
// ・Google Places API は使いません（＝料金・1日の上限の心配なし）
// ・【安全装置】取得元は週によってデータが欠けることがあります
//   （例: セブン-イレブンが21,845件 → 6,000件しか取れていない回があった）。
//   そこで「前回より1割以上減った」「店番の8割以上が入れ替わった」ときは
//   その回を使わず、1つ前の回 → さらに前の回…とさかのぼって探します。
//   どの回もダメなら、今ある一覧をそのまま残します（消さない）。
//
// 手元で試すとき:
//   node scripts/build-stores.mjs            → 全チェーン
//   node scripts/build-stores.mjs lawson     → 指定したチェーンだけ
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHAINS } from "../lib/store-core.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "data", "stores");
const LATEST_URL = "https://data.alltheplaces.xyz/runs/latest.json";
const HISTORY_URL = "https://data.alltheplaces.xyz/runs/history.json";
const MAX_RUNS_BACK = 8;        // 何回前までさかのぼって探すか
const KEEP_RATIO = 0.9;         // 前回の件数の9割を下回ったら「欠けている」とみなす
const REF_OVERLAP_RATIO = 0.8;  // 前回あった店番の8割以上が残っていること（店番の付け方が変わった事故を防ぐ）

async function fetchJson(url, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "eatin-map.jp store master builder" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 3000 * (i + 1)));
    }
  }
  throw new Error(`${url} の取得に失敗: ${lastErr?.message || lastErr}`);
}

// 全角英数字・全角記号を半角にそろえる（「１丁目」→「1丁目」）
const nfkc = s => (s || "").normalize("NFKC").replace(/\s+/g, " ").trim();
const withTen = b => (b && !/店$/.test(b) ? `${b}店` : b);

// 画面に出す店名を組み立てる（チェーンごとに元データの形が少しずつ違う）
export function displayName(chain, p) {
  const branch = nfkc(p.branch);
  const name = nfkc(p.name);
  switch (chain) {
    case "seven":
      return `セブン-イレブン ${withTen(branch)}`;
    case "famima":
      // 店名が空の店は「トモニー○○駅店」のように支店名に屋号が入っている
      return name ? `${name} ${branch}` : branch;
    case "lawson": {
      // 支店名の先頭に付く記号: LTF＝ローソン・スリーエフ、H＝施設内の店舗
      if (/^LTF(?=[^\x00-\x7f])/.test(branch)) return `ローソン・スリーエフ ${withTen(branch.replace(/^LTF/, ""))}`;
      if (/^LAWSON\+toks/i.test(branch)) return `LAWSON+toks ${withTen(branch.replace(/^LAWSON\+toks/i, ""))}`;
      return `${name || "ローソン"} ${withTen(branch.replace(/^H(?=[^\x00-\x7f])/, ""))}`;
    }
    case "ministop":
      return `ミニストップ ${branch}`;
    case "daily": {
      // 元データの店名は「デイリーヤマザキ○○店」と支店名までつながっている
      const brand = (name.endsWith(branch) ? name.slice(0, name.length - branch.length) : name).replace(/デイリ[-－‐]/g, "デイリー").trim();
      return `${brand || "デイリーヤマザキ"} ${branch}`;
    }
    case "newdays":
      return `NewDays ${branch}`;
    case "seico":
      return `セイコーマート ${withTen(branch)}`;
    case "poplar":
      return `${name || "ポプラ"} ${branch}`;
    default:
      return `${name} ${branch}`.trim();
  }
}

// 1チェーン分のGeoJSONを、マスタの行 [店番, 店名, 緯度, 経度, 住所, 公式のイートイン表示(0/1)] に変換
export function toRows(chain, geojson) {
  const rows = new Map();
  for (const f of geojson.features || []) {
    const p = f.properties || {};
    const c = f.geometry?.coordinates;
    if (!Array.isArray(c) || p.ref == null || !p.branch) continue;
    if (!p.shop) continue; // コンビニ以外（併設カフェなど）は載せない
    const lng = Number(c[0]), lat = Number(c[1]);
    // 日本の範囲外の座標は入力ミスとみなして除く
    if (!(lat > 20 && lat < 46 && lng > 122 && lng < 154)) continue;
    const ref = String(p.ref);
    rows.set(ref, [
      ref,
      displayName(chain, p),
      Math.round(lat * 1e6) / 1e6,
      Math.round(lng * 1e6) / 1e6,
      nfkc(p["addr:full"] || [p["addr:state"], p["addr:city"], p["addr:street_address"]].filter(Boolean).join("")),
      // 公式サイトに「イートインあり」と出ている店（今はローソンとNewDaysの一部だけ）。まだ画面では使っていない
      p.indoor_seating === "yes" ? 1 : 0,
    ]);
  }
  return [...rows.values()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

function readPrev(chain) {
  try {
    return JSON.parse(fs.readFileSync(path.join(OUT_DIR, `${chain}.json`), "utf8"));
  } catch {
    return null;
  }
}

// 1店舗1行で書き出す（更新のたびの差分が小さく・読みやすくなる）
function writeChain(chain, run, rows) {
  const body = rows.map(r => JSON.stringify(r)).join(",\n");
  const text = `{"chain":${JSON.stringify(chain)},"run":${JSON.stringify(run)},"count":${rows.length},"stores":[\n${body}\n]}\n`;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, `${chain}.json`), text);
}

async function main() {
  const only = process.argv.slice(2).filter(a => CHAINS[a]);
  const targets = only.length > 0 ? only : Object.keys(CHAINS);

  const latest = await fetchJson(LATEST_URL);
  let history = [];
  try {
    const h = await fetchJson(HISTORY_URL);
    history = Array.isArray(h) ? h : h.runs || [];
  } catch (e) {
    console.warn(`⚠️ 過去の回の一覧が取れませんでした（最新の回だけで続行）: ${e.message}`);
  }
  // 新しい順に並べた候補（最新 → 1つ前 → …）
  const runs = [latest, ...history.filter(r => r.run_id !== latest.run_id).sort((a, b) => (a.run_id < b.run_id ? 1 : -1))]
    .filter(r => r?.run_id && r?.output_url)
    .slice(0, MAX_RUNS_BACK);

  const statsCache = new Map();
  async function featureCount(run, spider) {
    if (!run.stats_url) return null;
    if (!statsCache.has(run.run_id)) {
      statsCache.set(run.run_id, await fetchJson(run.stats_url).catch(() => null));
    }
    const s = statsCache.get(run.run_id);
    const list = Array.isArray(s) ? s : s?.results;
    if (!Array.isArray(list)) return null;
    const hit = list.find(x => x.spider === spider);
    return hit ? hit.features ?? null : 0;
  }

  const report = [];
  let failedWithoutData = false;

  for (const chain of targets) {
    const { spider, label, min } = CHAINS[chain];
    const prev = readPrev(chain);
    const prevCount = prev?.stores?.length || 0;
    const need = Math.max(min, Math.floor(prevCount * KEEP_RATIO));
    const prevRefs = prev ? new Set(prev.stores.map(r => r[0])) : null;

    let chosen = null;
    const notes = [];
    for (const run of runs) {
      // 前回と同じ回なら取り直す必要なし
      if (prev && prev.run === run.run_id) { chosen = { run: run.run_id, rows: prev.stores, same: true }; break; }
      try {
        // まず集計表の件数だけ見て、明らかに欠けている回はダウンロードせずに飛ばす
        const n = await featureCount(run, spider);
        if (n != null && n < need) { notes.push(`${run.run_id.slice(0, 10)}は${n}件で不足`); continue; }
        const geo = await fetchJson(run.output_url.replace(/output\.zip$/, `output/${spider}.geojson`));
        const rows = toRows(chain, geo);
        if (rows.length < need) { notes.push(`${run.run_id.slice(0, 10)}は${rows.length}件で不足`); continue; }
        if (prevRefs && prevRefs.size > 0) {
          const kept = rows.filter(r => prevRefs.has(r[0])).length;
          if (kept < prevRefs.size * REF_OVERLAP_RATIO) { notes.push(`${run.run_id.slice(0, 10)}は店番が大きく入れ替わっている`); continue; }
        }
        chosen = { run: run.run_id, rows };
        break;
      } catch (e) {
        notes.push(`${run.run_id.slice(0, 10)}は取得エラー（${e.message}）`);
      }
    }

    if (!chosen) {
      if (!prev) failedWithoutData = true;
      report.push(`⚠️ ${label}: 使える回が見つからず、${prev ? `今の一覧（${prevCount}店）をそのまま残しました` : "一覧を作れませんでした"}。${notes.join("／")}`);
      continue;
    }
    if (chosen.same) {
      report.push(`✓ ${label}: ${prevCount}店（変更なし）`);
      continue;
    }
    writeChain(chain, chosen.run, chosen.rows);
    const diff = prev ? `（前回${prevCount}店 → ${chosen.rows.length}店）` : "（新規）";
    report.push(`✓ ${label}: ${chosen.rows.length}店 ${diff} 取得元の回=${chosen.run.slice(0, 10)}${notes.length ? `　※${notes.join("／")}` : ""}`);
  }

  const text = report.join("\n");
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## 店舗マスタの更新\n\n${report.map(l => `- ${l}`).join("\n")}\n`);
  }
  if (failedWithoutData) process.exit(1);
}

// このファイルを直接実行したときだけ動かす（テストから関数だけ読み込めるように）
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e); process.exit(1); });
}
