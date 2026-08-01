// ============================================================
// イートイン情報 初期データ投入スクリプト
//
// Googleクチコミを取得し、Claude（Haiku）でイートイン有無を
// 判定してFirestoreに「AI推定」として登録します。
//
// 使い方（プロジェクトフォルダのターミナルで）:
//   node scripts/seed-eatin.mjs                → お試し実行（書き込みなし・結果表示のみ）
//   node scripts/seed-eatin.mjs --write        → 実際にFirestoreへ書き込む
//   node scripts/seed-eatin.mjs --area umeda   → 梅田だけ対象（お試し）
//   node scripts/seed-eatin.mjs --area umeda --write
//   node scripts/seed-eatin.mjs --write --force → 実行済みの駅もやり直す
//
// 実行済みの駅・判定済みの店は scripts/seed-log.json に記録され、
// 次回から自動でスキップされます（APIの二重支払い防止）
//
// 必要な設定（.env.local に記載）:
//   GOOGLE_PLACES_API_KEY=...   （Places用サーバーキー）
//   ANTHROPIC_API_KEY=...       （Claude APIキー）
// ============================================================

import { readFileSync, writeFileSync } from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";

// ---- .env.local を読み込む ----
try {
  const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  console.log("⚠️ .env.local が見つかりません（環境変数が設定済みなら問題ありません）");
}

const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const WRITE = process.argv.includes("--write");
const FORCE = process.argv.includes("--force");
const areaArg = (() => { const i = process.argv.indexOf("--area"); return i >= 0 ? process.argv[i + 1] : null; })();

// ---- 実行ログ（同じ駅の再検索・同じ店の再判定を防ぐ） ----
const LOG_PATH = new URL("./seed-log.json", import.meta.url);
function loadLog() {
  try { return JSON.parse(readFileSync(LOG_PATH, "utf8")); } catch { return { areas: {}, judged: {} }; }
}
function saveLog(log) {
  try { writeFileSync(LOG_PATH, JSON.stringify(log, null, 2)); } catch {}
}

if (!PLACES_KEY) { console.error("❌ GOOGLE_PLACES_API_KEY がありません"); process.exit(1); }
if (!ANTHROPIC_KEY) { console.error("❌ ANTHROPIC_API_KEY がありません"); process.exit(1); }

// ---- エリア一覧（lib/areas.js と同じ内容。追加時は両方に足すこと） ----
const AREAS = {
  // 主要ターミナル
  shinjuku:  { name: "新宿",       lat: 35.6896, lng: 139.7006 },
  shibuya:   { name: "渋谷",       lat: 35.6580, lng: 139.7016 },
  ikebukuro: { name: "池袋",       lat: 35.7295, lng: 139.7109 },
  tokyo:     { name: "東京駅周辺", lat: 35.6812, lng: 139.7671 },
  shinagawa: { name: "品川",       lat: 35.6285, lng: 139.7387 },
  akihabara: { name: "秋葉原",     lat: 35.6984, lng: 139.7731 },
  yokohama:  { name: "横浜",       lat: 35.4657, lng: 139.6222 },
  omiya:     { name: "大宮",       lat: 35.9063, lng: 139.6237 },
  // 東京23区の主要駅
  ueno:          { name: "上野",       lat: 35.7138, lng: 139.7770 },
  asakusa:       { name: "浅草",       lat: 35.7100, lng: 139.7976 },
  kinshicho:     { name: "錦糸町",     lat: 35.6961, lng: 139.8143 },
  kitasenju:     { name: "北千住",     lat: 35.7494, lng: 139.8048 },
  nakano:        { name: "中野",       lat: 35.7059, lng: 139.6659 },
  ogikubo:       { name: "荻窪",       lat: 35.7045, lng: 139.6202 },
  ebisu:         { name: "恵比寿",     lat: 35.6466, lng: 139.7100 },
  meguro:        { name: "目黒",       lat: 35.6339, lng: 139.7157 },
  gotanda:       { name: "五反田",     lat: 35.6261, lng: 139.7232 },
  kamata:        { name: "蒲田",       lat: 35.5622, lng: 139.7161 },
  oimachi:       { name: "大井町",     lat: 35.6060, lng: 139.7343 },
  jiyugaoka:     { name: "自由が丘",   lat: 35.6072, lng: 139.6690 },
  shimokitazawa: { name: "下北沢",     lat: 35.6614, lng: 139.6667 },
  sangenjaya:    { name: "三軒茶屋",   lat: 35.6437, lng: 139.6698 },
  akabane:       { name: "赤羽",       lat: 35.7776, lng: 139.7210 },
  sugamo:        { name: "巣鴨",       lat: 35.7335, lng: 139.7391 },
  nippori:       { name: "日暮里",     lat: 35.7281, lng: 139.7707 },
  takadanobaba:  { name: "高田馬場",   lat: 35.7123, lng: 139.7030 },
  iidabashi:     { name: "飯田橋",     lat: 35.7021, lng: 139.7450 },
  kanda:         { name: "神田",       lat: 35.6917, lng: 139.7708 },
  ginza:         { name: "銀座",       lat: 35.6717, lng: 139.7640 },
  shimbashi:     { name: "新橋",       lat: 35.6662, lng: 139.7583 },
  roppongi:      { name: "六本木",     lat: 35.6627, lng: 139.7307 },
  toyosu:        { name: "豊洲",       lat: 35.6544, lng: 139.7955 },
  // オフィス街の主要駅（オフィスワーカー30選より）
  otemachi:        { name: "大手町",       lat: 35.6853, lng: 139.7633 },
  nihombashi:      { name: "日本橋",       lat: 35.6821, lng: 139.7747 },
  mitsukoshimae:   { name: "三越前",       lat: 35.6872, lng: 139.7736 },
  "kyobashi-tokyo": { name: "京橋（東京）", lat: 35.6767, lng: 139.7700 },
  kayabacho:       { name: "茅場町",       lat: 35.6799, lng: 139.7802 },
  hatchobori:      { name: "八丁堀",       lat: 35.6746, lng: 139.7769 },
  shiodome:        { name: "汐留",         lat: 35.6629, lng: 139.7600 },
  hamamatsucho:    { name: "浜松町",       lat: 35.6554, lng: 139.7571 },
  tamachi:         { name: "田町",         lat: 35.6457, lng: 139.7476 },
  osaki:           { name: "大崎",         lat: 35.6199, lng: 139.7282 },
  akasaka:         { name: "赤坂",         lat: 35.6722, lng: 139.7364 },
  tameikesanno:    { name: "溜池山王",     lat: 35.6721, lng: 139.7414 },
  toranomon:       { name: "虎ノ門",       lat: 35.6701, lng: 139.7501 },
  kamiyacho:       { name: "神谷町",       lat: 35.6631, lng: 139.7452 },
  kasumigaseki:    { name: "霞ケ関",       lat: 35.6740, lng: 139.7511 },
  uchisaiwaicho:   { name: "内幸町",       lat: 35.6694, lng: 139.7553 },
  ochanomizu:      { name: "御茶ノ水",     lat: 35.6997, lng: 139.7644 },
  ichigaya:        { name: "市ケ谷",       lat: 35.6910, lng: 139.7356 },
  // 大阪市内の主要駅
  umeda:        { name: "梅田・大阪駅", lat: 34.7025, lng: 135.4959 },
  namba:        { name: "難波",         lat: 34.6633, lng: 135.5021 },
  tennoji:      { name: "天王寺",       lat: 34.6465, lng: 135.5133 },
  shinosaka:    { name: "新大阪",       lat: 34.7335, lng: 135.5000 },
  shinsaibashi: { name: "心斎橋",       lat: 34.6740, lng: 135.5010 },
  honmachi:     { name: "本町",         lat: 34.6817, lng: 135.4990 },
  yodoyabashi:  { name: "淀屋橋",       lat: 34.6926, lng: 135.5012 },
  kyobashi:     { name: "京橋",         lat: 34.6968, lng: 135.5343 },
  tsuruhashi:   { name: "鶴橋",         lat: 34.6656, lng: 135.5310 },
  fukushima:    { name: "福島（大阪）", lat: 34.6971, lng: 135.4861 },
  juso:         { name: "十三",         lat: 34.7210, lng: 135.4818 },
  nishikujo:    { name: "西九条",       lat: 34.6828, lng: 135.4661 },
  shinimamiya:  { name: "新今宮",       lat: 34.6494, lng: 135.5011 },
  // その他の都市
  kyoto:     { name: "京都駅周辺", lat: 34.9858, lng: 135.7585 },
  sannomiya: { name: "三宮・神戸", lat: 34.6938, lng: 135.1954 },
  nagoya:    { name: "名古屋駅周辺", lat: 35.1709, lng: 136.8815 },
  sapporo:   { name: "札幌駅周辺", lat: 43.0687, lng: 141.3508 },
  hakata:    { name: "博多・天神", lat: 33.5902, lng: 130.4207 },
};

// ---- Firebase（lib/firebase.js と同じ設定） ----
const firebaseConfig = {
  apiKey: "AIzaSyB5eSZLCsrCCuUKXdmKwZyUxqlNbPBpZoI",
  authDomain: "eatin-map-ee417.firebaseapp.com",
  projectId: "eatin-map-ee417",
  storageBucket: "eatin-map-ee417.firebasestorage.app",
  messagingSenderId: "850029980493",
  appId: "1:850029980093:web:bd2ea9a6e942b342220ad4",
};
const db = getFirestore(initializeApp(firebaseConfig));
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---- クチコミ付きでコンビニを検索 ----
async function fetchStores(lat, lng) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": PLACES_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.reviews",
    },
    body: JSON.stringify({
      includedTypes: ["convenience_store"],
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: 1200 } },
      languageCode: "ja",
      maxResultCount: 20,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Places APIエラー: ${data.error.message}`);
  return (data.places || []).map(p => ({
    placeId: p.id,
    name: p.displayName?.text || "",
    address: p.formattedAddress || "",
    reviews: (p.reviews || []).map(r => r.text?.text).filter(Boolean),
  }));
}

// ---- Claudeでイートイン有無を判定 ----
async function judgeEatIn(store) {
  if (store.reviews.length === 0) return { hasEatIn: null, evidence: "クチコミなし" };
  const reviewText = store.reviews.join("\n---\n").slice(0, 4000);
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{
      role: "user",
      content: `以下はコンビニ「${store.name}」のGoogleクチコミです。この店舗にイートインスペース（店内の飲食席）があるかを判定してください。

判定基準:
- 「イートイン」「店内で食べた」「座席がある」「カウンター席」など明確な言及 → true
- 「イートインがない」「席が撤去された」など明確な言及 → false
- 判断できる情報がない → null

回答は次のJSONのみ（説明文は不要）:
{"hasEatIn": true または false または null, "evidence": "根拠を30字以内で"}

クチコミ:
${reviewText}`,
    }],
  });
  try {
    const text = msg.content[0].text.replace(/```json|```/g, "").trim();
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return { hasEatIn: json.hasEatIn ?? null, evidence: String(json.evidence || "").slice(0, 60) };
  } catch {
    return { hasEatIn: null, evidence: "判定失敗" };
  }
}

// ---- メイン ----
async function main() {
  console.log(WRITE ? "🔴 書き込みモード（Firestoreに登録します）" : "🟡 お試しモード（表示のみ。登録するには --write を付ける）");

  // 既に投稿がある店舗はスキップ（上書きしない）
  const existing = new Set();
  const snap = await getDocs(collection(db, "verifications"));
  snap.forEach(d => existing.add(d.data().placeId));
  console.log(`既存の投稿がある店舗: ${existing.size}件（これらはスキップ）\n`);

  const targets = areaArg ? { [areaArg]: AREAS[areaArg] } : AREAS;
  if (areaArg && !AREAS[areaArg]) { console.error(`❌ エリア「${areaArg}」がありません。指定できる値: ${Object.keys(AREAS).join(", ")}`); process.exit(1); }

  const log = loadLog();
  let total = 0, judged = 0, written = 0;
  for (const [slug, area] of Object.entries(targets)) {
    if (!FORCE && log.areas[slug]) {
      console.log(`\n⏭️ ${area.name} (${slug}) は実行済み（${String(log.areas[slug]).slice(0, 10)}）— スキップ。やり直すには --force`);
      continue;
    }
    console.log(`\n📍 ${area.name} (${slug}) を検索中…`);
    let stores;
    try { stores = await fetchStores(area.lat, area.lng); }
    catch (e) { console.error(`  ⚠️ ${e.message}`); continue; }
    console.log(`  ${stores.length}店舗見つかりました`);

    for (const store of stores) {
      total++;
      if (existing.has(store.placeId)) { console.log(`  ⏭️ ${store.name}（投稿済み）`); continue; }
      if (!FORCE && store.placeId in log.judged) { console.log(`  ⏭️ ${store.name}（判定済み）`); continue; }
      const { hasEatIn, evidence } = await judgeEatIn(store);
      judged++;
      const mark = hasEatIn === true ? "🪑 あり" : hasEatIn === false ? "✗ なし" : "? 不明";
      console.log(`  ${mark} ${store.name} — ${evidence}`);
      if (WRITE) {
        log.judged[store.placeId] = hasEatIn; // 「不明」も記録して再判定を防ぐ
        if (hasEatIn !== null) {
          await addDoc(collection(db, "verifications"), {
            placeId: store.placeId,
            placeName: store.name,
            hasEatIn,
            outlet: false, wifi: false, seats: null,
            comment: `🤖 AI推定：${evidence}`,
            source: "ai",
            createdAt: new Date(),
          });
          written++;
          existing.add(store.placeId);
        }
      }
      await sleep(400); // API負荷を抑える
    }
    // この駅を実行済みとして記録（お試しモードでは記録しない）
    if (WRITE) { log.areas[slug] = new Date().toISOString(); saveLog(log); }
  }

  console.log(`\n===== 結果 =====`);
  console.log(`対象店舗: ${total}件 / 判定実行: ${judged}件 / Firestore登録: ${written}件`);
  if (!WRITE) console.log(`\n登録するには: node scripts/seed-eatin.mjs --write`);
  process.exit(0);
}

main().catch(e => { console.error("❌ エラー:", e); process.exit(1); });
