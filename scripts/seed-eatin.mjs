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
//
// 必要な設定（.env.local に記載）:
//   GOOGLE_PLACES_API_KEY=...   （Places用サーバーキー）
//   ANTHROPIC_API_KEY=...       （Claude APIキー）
// ============================================================

import { readFileSync } from "fs";
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
const areaArg = (() => { const i = process.argv.indexOf("--area"); return i >= 0 ? process.argv[i + 1] : null; })();

if (!PLACES_KEY) { console.error("❌ GOOGLE_PLACES_API_KEY がありません"); process.exit(1); }
if (!ANTHROPIC_KEY) { console.error("❌ ANTHROPIC_API_KEY がありません"); process.exit(1); }

// ---- エリア一覧（lib/areas.js と同じ内容） ----
const AREAS = {
  shinjuku:  { name: "新宿",       lat: 35.6896, lng: 139.7006 },
  shibuya:   { name: "渋谷",       lat: 35.6580, lng: 139.7016 },
  ikebukuro: { name: "池袋",       lat: 35.7295, lng: 139.7109 },
  tokyo:     { name: "東京駅周辺", lat: 35.6812, lng: 139.7671 },
  shinagawa: { name: "品川",       lat: 35.6285, lng: 139.7387 },
  akihabara: { name: "秋葉原",     lat: 35.6984, lng: 139.7731 },
  yokohama:  { name: "横浜",       lat: 35.4657, lng: 139.6222 },
  omiya:     { name: "大宮",       lat: 35.9063, lng: 139.6237 },
  umeda:     { name: "梅田・大阪駅", lat: 34.7025, lng: 135.4959 },
  namba:     { name: "難波",       lat: 34.6633, lng: 135.5021 },
  tennoji:   { name: "天王寺",     lat: 34.6465, lng: 135.5133 },
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

  let total = 0, judged = 0, written = 0;
  for (const [slug, area] of Object.entries(targets)) {
    console.log(`\n📍 ${area.name} (${slug}) を検索中…`);
    let stores;
    try { stores = await fetchStores(area.lat, area.lng); }
    catch (e) { console.error(`  ⚠️ ${e.message}`); continue; }
    console.log(`  ${stores.length}店舗見つかりました`);

    for (const store of stores) {
      total++;
      if (existing.has(store.placeId)) { console.log(`  ⏭️ ${store.name}（投稿済み）`); continue; }
      const { hasEatIn, evidence } = await judgeEatIn(store);
      judged++;
      const mark = hasEatIn === true ? "🪑 あり" : hasEatIn === false ? "✗ なし" : "? 不明";
      console.log(`  ${mark} ${store.name} — ${evidence}`);
      if (hasEatIn !== null && WRITE) {
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
      await sleep(400); // API負荷を抑える
    }
  }

  console.log(`\n===== 結果 =====`);
  console.log(`対象店舗: ${total}件 / 判定実行: ${judged}件 / Firestore登録: ${written}件`);
  if (!WRITE) console.log(`\n登録するには: node scripts/seed-eatin.mjs --write`);
  process.exit(0);
}

main().catch(e => { console.error("❌ エラー:", e); process.exit(1); });
